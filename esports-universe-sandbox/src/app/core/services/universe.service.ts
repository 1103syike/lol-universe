import { Injectable, computed, signal } from '@angular/core';
import { applySeedCoachDefaults, buildOpeningLeague, ensureTeamCoaches } from '../data/initial-teams';
import { applySeedPlayerDefaults, SEED_POWER_REVISION } from '../data/player-power-profiles';
import type { Coach } from '../models/coach.model';
import { COACH_ATTRIBUTE_KEYS, isCoachAttributeKey } from '../models/coach.model';
import type { Player } from '../models/player.model';
import { ATTRIBUTE_KEYS, isPlayerNationality } from '../models/player.model';
import type { Team } from '../models/team.model';
import { stripEmbeddedTitleSponsor } from '../models/team.model';
import { TEAM_TIMELINE_KINDS } from '../models/team-timeline.model';
import type { TeamTimelineEvent } from '../models/team-timeline.model';
import type { UniverseData, UniverseStoreSnapshot, UniverseSummary } from '../models/universe.model';
import {
  isValidUniverseStartYear,
  universeDateFromStartYear,
} from '../models/universe.model';
import { isRarity, suggestRarityFromOvr } from '../models/rarity.model';
import { createDefaultAttributes, clampRating } from '../../shared/utils/create-default-attributes';
import { createDefaultCoachAttributes } from '../../shared/utils/create-default-coach-attributes';
import { calculateCoachOvr, calculatePlayerOvr } from '../../shared/utils/player-ovr';
import { defaultTeamLogoUrl } from '../../shared/utils/team-logo';
import type { PlayerAttributes } from '../models/player.model';
import { rememberShuffledFixtures } from '../../shared/utils/opening-fixtures';
import { StorageAdapter } from '../storage/storage.adapter';
import { STORAGE_KEYS } from '../storage/storage.tokens';

const EMPTY_STORE: UniverseStoreSnapshot = {
  activeUniverseId: null,
  universes: [],
};

const DEFAULT_START_YEAR = 2026;

@Injectable({ providedIn: 'root' })
export class UniverseService {
  private readonly storeState = signal<UniverseStoreSnapshot>(EMPTY_STORE);
  private readonly activeUniverseState = signal<UniverseData | null>(null);

  readonly universes = computed(() => this.storeState().universes);
  readonly activeUniverseId = computed(() => this.storeState().activeUniverseId);
  readonly activeUniverse = computed(() => this.activeUniverseState());
  readonly hasUniverses = computed(() => this.storeState().universes.length > 0);

  constructor(private readonly storage: StorageAdapter) {
    this.hydrate();
  }

  createUniverse(name: string, startYear: number): UniverseData {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('宇宙名稱不可為空');
    }
    if (!isValidUniverseStartYear(startYear)) {
      throw new Error('開始年份須為 2021 以後');
    }

    const now = new Date().toISOString();
    const universe: UniverseData = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
      startYear,
      currentDate: universeDateFromStartYear(startYear),
      seedPowerRevision: SEED_POWER_REVISION,
      ...buildOpeningLeague(now, startYear),
      teamEvents: [],
      hiddenTimelineIds: [],
    };

    this.writeUniverse(universe);
    rememberShuffledFixtures(this.storage, universe);
    this.persistStore({
      activeUniverseId: universe.id,
      universes: [...this.storeState().universes, this.toSummary(universe)],
    });
    this.activeUniverseState.set(universe);

    return universe;
  }

  updateUniverse(universeId: string, name: string, startYear: number): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('宇宙名稱不可為空');
    }
    if (!isValidUniverseStartYear(startYear)) {
      throw new Error('開始年份須為 2021 以後');
    }

    const current = this.readUniverseData(universeId);
    if (!current) {
      return;
    }

    const startYearChanged = current.startYear !== startYear;
    const updated: UniverseData = {
      ...current,
      name: trimmedName,
      startYear,
      currentDate: startYearChanged
        ? universeDateFromStartYear(startYear)
        : current.currentDate,
      updatedAt: new Date().toISOString(),
    };

    this.writeUniverse(updated);
    this.persistStore({
      ...this.storeState(),
      universes: this.storeState().universes.map((item) =>
        item.id === universeId ? this.toSummary(updated) : item,
      ),
    });

    if (this.activeUniverseId() === universeId) {
      this.activeUniverseState.set(updated);
    }
  }

  duplicateUniverse(universeId: string): UniverseData | null {
    const source = this.readUniverseData(universeId);
    if (!source) {
      return null;
    }

    const now = new Date().toISOString();
    const copied: UniverseData = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: `${source.name}（副本）`,
      createdAt: now,
      updatedAt: now,
    };

    this.writeUniverse(copied);
    this.persistStore({
      activeUniverseId: copied.id,
      universes: [...this.storeState().universes, this.toSummary(copied)],
    });
    this.activeUniverseState.set(copied);

    return copied;
  }

  deleteUniverse(universeId: string): void {
    const remaining = this.storeState().universes.filter((item) => item.id !== universeId);
    this.storage.removeItem(STORAGE_KEYS.universeData(universeId));

    const wasActive = this.activeUniverseId() === universeId;
    const nextActiveId = wasActive ? (remaining[0]?.id ?? null) : this.activeUniverseId();

    this.persistStore({
      activeUniverseId: nextActiveId,
      universes: remaining,
    });

    if (nextActiveId) {
      this.loadActiveUniverse(nextActiveId);
    } else {
      this.activeUniverseState.set(null);
    }
  }

  switchUniverse(universeId: string): void {
    const exists = this.storeState().universes.some((item) => item.id === universeId);
    if (!exists) {
      return;
    }

    this.persistStore({
      ...this.storeState(),
      activeUniverseId: universeId,
    });
    this.loadActiveUniverse(universeId);
  }

  replaceActiveUniverseTeams(teams: Team[]): void {
    this.patchActiveUniverse({ teams });
  }

  setCurrentDate(isoDate: string): void {
    const active = this.activeUniverseState();
    if (!active || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return;
    }
    const updated: UniverseData = {
      ...active,
      currentDate: isoDate,
      updatedAt: new Date().toISOString(),
    };
    this.writeUniverse(updated);
    this.activeUniverseState.set(updated);
  }

  patchActiveUniverse(
    patch: Partial<
      Pick<UniverseData, 'teams' | 'players' | 'coaches' | 'teamEvents' | 'hiddenTimelineIds' | 'seedPowerRevision'>
    >,
  ): void {
    const active = this.activeUniverseState();
    if (!active) {
      throw new Error('尚未選擇宇宙');
    }

    const updated: UniverseData = {
      ...active,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.writeUniverse(updated);
    this.persistStore({
      ...this.storeState(),
      universes: this.storeState().universes.map((item) =>
        item.id === updated.id ? this.toSummary(updated) : item,
      ),
    });
    this.activeUniverseState.set(updated);
  }

  private hydrate(): void {
    const stored = this.storage.getItem<UniverseStoreSnapshot>(STORAGE_KEYS.universeStore);
    const store = stored ?? this.createInitialStore();
    const normalizedStore: UniverseStoreSnapshot = {
      ...store,
      universes: store.universes.map((item) => this.normalizeSummary(item)),
    };
    this.persistStore(normalizedStore);

    if (normalizedStore.activeUniverseId) {
      this.loadActiveUniverse(normalizedStore.activeUniverseId);
    }
  }

  private createInitialStore(): UniverseStoreSnapshot {
    const now = new Date().toISOString();
    const seed: UniverseData = {
      id: crypto.randomUUID(),
      name: '預設宇宙',
      createdAt: now,
      updatedAt: now,
      startYear: DEFAULT_START_YEAR,
      currentDate: universeDateFromStartYear(DEFAULT_START_YEAR),
      seedPowerRevision: SEED_POWER_REVISION,
      ...buildOpeningLeague(now, DEFAULT_START_YEAR),
      teamEvents: [],
      hiddenTimelineIds: [],
    };

    this.writeUniverse(seed);
    rememberShuffledFixtures(this.storage, seed);

    return {
      activeUniverseId: seed.id,
      universes: [this.toSummary(seed)],
    };
  }

  private persistStore(store: UniverseStoreSnapshot): void {
    this.storage.setItem(STORAGE_KEYS.universeStore, store);
    this.storeState.set(store);
  }

  private loadActiveUniverse(universeId: string): void {
    const data = this.readUniverseData(universeId);
    if (!data) {
      this.activeUniverseState.set(null);
      return;
    }
    this.writeUniverse(data);
    this.activeUniverseState.set(data);
  }

  private readUniverseData(universeId: string): UniverseData | null {
    const raw = this.storage.getItem<UniverseData>(STORAGE_KEYS.universeData(universeId));
    if (!raw) {
      return null;
    }
    return this.normalizeUniverse(raw);
  }

  private writeUniverse(universe: UniverseData): void {
    this.storage.setItem(STORAGE_KEYS.universeData(universe.id), this.normalizeUniverse(universe));
  }

  private normalizeUniverse(universe: UniverseData): UniverseData {
    const rawTeams = Array.isArray(universe.teams) ? universe.teams : [];
    const rawPlayers = Array.isArray(universe.players) ? universe.players : [];
    const coaches = Array.isArray(universe.coaches) ? universe.coaches : [];
    const startYear = this.resolveStartYear(universe);
    const currentRevision = Number(universe.seedPowerRevision ?? 0);
    const shouldSyncPower = currentRevision < SEED_POWER_REVISION;
    const seeded = applySeedPlayerDefaults(
      rawPlayers.map((player) => this.normalizePlayer(player)),
      rawTeams.map((team) => this.normalizeTeam(team)),
      { syncPower: shouldSyncPower },
    );
    const normalizedCoaches = coaches.map((coach) => this.normalizeCoach(coach));
    const syncedCoaches = shouldSyncPower
      ? applySeedCoachDefaults(normalizedCoaches)
      : normalizedCoaches;
    const withCoaches = ensureTeamCoaches(seeded.teams, syncedCoaches, { startYear });

    return {
      ...universe,
      startYear,
      currentDate: universe.currentDate?.trim()
        ? universe.currentDate
        : universeDateFromStartYear(startYear),
      seedPowerRevision: Math.max(currentRevision, SEED_POWER_REVISION),
      teams: withCoaches.teams,
      players: seeded.players,
      coaches: withCoaches.coaches,
      teamEvents: this.normalizeTeamEvents(universe.teamEvents),
      hiddenTimelineIds: this.normalizeHiddenIds(universe.hiddenTimelineIds),
    };
  }

  private resolveStartYear(universe: UniverseData): number {
    const rawYear = Number(universe.startYear);
    if (isValidUniverseStartYear(rawYear)) {
      return rawYear;
    }

    const dateYear = Number(String(universe.currentDate ?? '').slice(0, 4));
    if (isValidUniverseStartYear(dateYear)) {
      return dateYear;
    }

    return DEFAULT_START_YEAR;
  }

  private normalizeHiddenIds(ids: string[] | undefined): string[] {
    if (!Array.isArray(ids)) {
      return [];
    }
    return ids.filter((id) => typeof id === 'string' && id.length > 0);
  }

  private normalizeTeamEvents(events: TeamTimelineEvent[] | undefined): TeamTimelineEvent[] {
    if (!Array.isArray(events)) {
      return [];
    }

    return events.filter((event) => {
      return (
        !!event &&
        typeof event.id === 'string' &&
        typeof event.teamId === 'string' &&
        TEAM_TIMELINE_KINDS.includes(event.kind) &&
        typeof event.date === 'string' &&
        typeof event.recordedAt === 'string' &&
        typeof event.summary === 'string'
      );
    });
  }

  private normalizeTeam(team: Team): Team {
    const sponsor = typeof team.titleSponsor === 'string' ? team.titleSponsor.trim() : '';
    const side = team.titleSponsorSide === 'prefix' || team.titleSponsorSide === 'suffix' ? team.titleSponsorSide : null;
    return {
      ...team,
      name: stripEmbeddedTitleSponsor(team.name, sponsor || null, sponsor ? side : null),
      titleSponsor: sponsor ? sponsor : null,
      titleSponsorSide: sponsor ? side : null,
      logoUrl: team.logoUrl?.trim() ? team.logoUrl : defaultTeamLogoUrl(team.abbreviation),
      coachId: team.coachId ?? null,
      playerIds: Array.isArray(team.playerIds) ? team.playerIds : [],
    };
  }

  private normalizePlayer(player: Player): Player {
    const nationalityCode = String(player.nationality ?? 'TW').toUpperCase();
    const attributes = this.normalizePlayerAttributes(player.attributes);
    const form = clampRating(Number.isFinite(player.form) ? Number(player.form) : 60);
    const rarity = isRarity(String(player.rarity ?? ''))
      ? player.rarity
      : suggestRarityFromOvr(calculatePlayerOvr(attributes, player.position));

    return {
      ...player,
      nationality: isPlayerNationality(nationalityCode) ? nationalityCode : 'TW',
      teamId: player.teamId ?? null,
      rarity,
      attributes,
      form,
      contract: player.contract ?? {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        annualSalary: 1_000_000,
      },
      careerRecords: Array.isArray(player.careerRecords) ? player.careerRecords : [],
    };
  }

  private normalizeCoach(coach: Coach): Coach {
    const nationalityCode = String(coach.nationality ?? 'TW').toUpperCase();
    const defaults = createDefaultCoachAttributes();
    const source = coach.attributes ?? defaults;
    const attributes = createDefaultCoachAttributes();

    for (const key of COACH_ATTRIBUTE_KEYS) {
      const value = isCoachAttributeKey(key) ? source[key] : defaults[key];
      attributes[key] = clampRating(Number.isFinite(value) ? Number(value) : defaults[key]);
    }

    const specialties = Array.isArray(coach.specialties)
      ? coach.specialties.filter((key): key is (typeof ATTRIBUTE_KEYS)[number] =>
          (ATTRIBUTE_KEYS as readonly string[]).includes(key),
        )
      : [];

    const gamertag = String(coach.gamertag ?? '').trim() || String(coach.displayName ?? '').trim() || 'Coach';
    const displayName = String(coach.displayName ?? '').trim() || gamertag;
    const rarity = isRarity(String(coach.rarity ?? ''))
      ? coach.rarity
      : suggestRarityFromOvr(calculateCoachOvr(attributes));

    return {
      ...coach,
      displayName,
      gamertag,
      nationality: isPlayerNationality(nationalityCode) ? nationalityCode : 'TW',
      teamId: coach.teamId ?? null,
      rarity,
      attributes,
      specialties,
      contract: coach.contract ?? {
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        annualSalary: 1_500_000,
      },
      careerRecords: Array.isArray(coach.careerRecords) ? coach.careerRecords : [],
    };
  }

  private normalizePlayerAttributes(source: PlayerAttributes | undefined): PlayerAttributes {
    const defaults = createDefaultAttributes();
    if (!source) {
      return defaults;
    }
    const attributes = createDefaultAttributes();
    for (const key of ATTRIBUTE_KEYS) {
      const current = clampRating(Number(source[key]?.current ?? defaults[key].current));
      let potential = clampRating(Number(source[key]?.potential ?? defaults[key].potential));
      if (potential < current) {
        potential = current;
      }
      attributes[key] = {
        current,
        potential,
        growthRate: Number.isFinite(source[key]?.growthRate)
          ? Number(source[key].growthRate)
          : defaults[key].growthRate,
      };
    }
    return attributes;
  }

  private toSummary(universe: UniverseData): UniverseSummary {
    return {
      id: universe.id,
      name: universe.name,
      startYear: universe.startYear,
      createdAt: universe.createdAt,
      updatedAt: universe.updatedAt,
    };
  }

  private normalizeSummary(summary: UniverseSummary): UniverseSummary {
    const rawYear = Number(summary.startYear);
    if (isValidUniverseStartYear(rawYear)) {
      return summary;
    }

    const data = this.storage.getItem<UniverseData>(STORAGE_KEYS.universeData(summary.id));
    if (data) {
      return this.toSummary(this.normalizeUniverse(data));
    }

    return {
      ...summary,
      startYear: DEFAULT_START_YEAR,
    };
  }
}
