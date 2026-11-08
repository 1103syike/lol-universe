import { Injectable, computed, inject } from '@angular/core';
import { buildOpeningLeague } from '../data/initial-teams';
import { SEED_POWER_REVISION } from '../data/player-power-profiles';
import type { Team, TeamInput, TitleSponsorSide } from '../models/team.model';
import { stripEmbeddedTitleSponsor, teamDisplayName } from '../models/team.model';
import { defaultTeamLogoUrl } from '../../shared/utils/team-logo';
import { rememberShuffledFixtures } from '../../shared/utils/opening-fixtures';
import { StorageAdapter } from '../storage/storage.adapter';
import { TeamTimelineService } from './team-timeline.service';
import { TransferWindowService } from './transfer-window.service';
import { UniverseService } from './universe.service';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly universeService = inject(UniverseService);
  private readonly timeline = inject(TeamTimelineService);
  private readonly windows = inject(TransferWindowService);
  private readonly storage = inject(StorageAdapter);

  readonly teams = computed(() => this.universeService.activeUniverse()?.teams ?? []);

  getTeamById(teamId: string): Team | null {
    return this.teams().find((team) => team.id === teamId) ?? null;
  }

  createTeam(input: TeamInput): Team {
    this.windows.assertOpen();
    const payload = this.normalizeInput(input);
    this.assertUniqueAbbreviation(payload.abbreviation);

    const now = new Date().toISOString();
    const team: Team = {
      id: crypto.randomUUID(),
      abbreviation: payload.abbreviation,
      name: payload.name,
      titleSponsor: payload.titleSponsor ?? null,
      titleSponsorSide: payload.titleSponsorSide ?? null,
      leagueTier: payload.leagueTier,
      salaryCap: payload.salaryCap,
      logoUrl: payload.logoUrl ?? defaultTeamLogoUrl(payload.abbreviation),
      coachId: null,
      playerIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.universeService.replaceActiveUniverseTeams([...this.teams(), team]);
    return team;
  }

  updateTeam(teamId: string, input: TeamInput): void {
    const current = this.getTeamById(teamId);
    if (!current) {
      throw new Error('找不到隊伍');
    }

    const payload = this.normalizeInput(input);
    this.assertUniqueAbbreviation(payload.abbreviation, teamId);
    const nameChanged = payload.abbreviation !== current.abbreviation || payload.name !== current.name;
    if (nameChanged) {
      this.windows.assertOpen();
    }

    const updated: Team = {
      ...current,
      abbreviation: payload.abbreviation,
      name: payload.name,
      titleSponsor: payload.titleSponsor ?? current.titleSponsor,
      titleSponsorSide: payload.titleSponsorSide ?? current.titleSponsorSide,
      leagueTier: current.leagueTier,
      salaryCap: payload.salaryCap,
      logoUrl: payload.logoUrl ?? defaultTeamLogoUrl(payload.abbreviation),
      updatedAt: new Date().toISOString(),
    };

    this.universeService.replaceActiveUniverseTeams(
      this.teams().map((team) => (team.id === teamId ? updated : team)),
    );
    if (nameChanged) {
      this.timeline.recordRename(teamId, current, payload);
    }
  }

  setTitleSponsor(teamId: string, sponsor: string | null, side: TitleSponsorSide | null): void {
    const current = this.getTeamById(teamId);
    if (!current) {
      throw new Error('找不到隊伍');
    }
    this.windows.assertOpen();

    const brand = sponsor?.trim() ?? '';
    if (brand && side !== 'prefix' && side !== 'suffix') {
      throw new Error('冠名要選前綴或後綴');
    }

    const updated: Team = {
      ...current,
      name: brand
        ? stripEmbeddedTitleSponsor(current.name, brand, side)
        : current.name,
      titleSponsor: brand ? brand : null,
      titleSponsorSide: brand ? side : null,
      updatedAt: new Date().toISOString(),
    };

    const before = teamDisplayName(current);
    const after = teamDisplayName(updated);
    this.universeService.replaceActiveUniverseTeams(
      this.teams().map((team) => (team.id === teamId ? updated : team)),
    );
    this.timeline.recordSponsorship(teamId, before, after);
  }

  acquireTeam(
    teamId: string,
    input: { buyer: string; abbreviation: string; name: string; logoUrl: string },
  ): void {
    const current = this.getTeamById(teamId);
    if (!current) {
      throw new Error('找不到隊伍');
    }
    this.windows.assertOpen();

    const buyer = input.buyer.trim();
    const abbreviation = input.abbreviation.trim();
    const name = input.name.trim();
    const logoUrl = input.logoUrl.trim();
    if (!buyer) {
      throw new Error('收購方不可為空');
    }
    if (!abbreviation) {
      throw new Error('隊伍縮寫不可為空');
    }
    if (!name) {
      throw new Error('隊伍名稱不可為空');
    }
    if (!logoUrl) {
      throw new Error('收購必須更換隊標');
    }
    this.assertUniqueAbbreviation(abbreviation, teamId);

    const updated: Team = {
      ...current,
      abbreviation,
      name,
      titleSponsor: null,
      titleSponsorSide: null,
      logoUrl,
      updatedAt: new Date().toISOString(),
    };

    this.timeline.recordAcquisition(teamId, buyer);
    this.timeline.recordRename(teamId, current, updated);
    this.universeService.replaceActiveUniverseTeams(
      this.teams().map((team) => (team.id === teamId ? updated : team)),
    );
  }

  deleteTeam(teamId: string): void {
    this.windows.assertOpen();
    this.universeService.replaceActiveUniverseTeams(
      this.teams().filter((team) => team.id !== teamId),
    );
    this.timeline.removeTeam(teamId);
  }

  seedInitialTeams(): void {
    if (this.teams().length > 0) {
      throw new Error('目前宇宙已有隊伍，無法載入初始名單');
    }

    const universe = this.universeService.activeUniverse();
    if (!universe) {
      throw new Error('尚未選擇宇宙');
    }

    const opening = buildOpeningLeague(new Date().toISOString(), universe.startYear);
    this.universeService.patchActiveUniverse({
      seedPowerRevision: SEED_POWER_REVISION,
      teams: opening.teams,
      players: opening.players,
      coaches: opening.coaches,
    });
    rememberShuffledFixtures(this.storage, {
      id: universe.id,
      startYear: universe.startYear,
      teams: opening.teams,
    });
  }

  private normalizeInput(input: TeamInput): TeamInput {
    const abbreviation = input.abbreviation.trim();
    const name = input.name.trim();
    const salaryCap = Number(input.salaryCap);
    const logoUrl = input.logoUrl?.trim() ? input.logoUrl.trim() : null;
    const sponsor = input.titleSponsor?.trim() ? input.titleSponsor.trim() : null;
    const side = sponsor && (input.titleSponsorSide === 'prefix' || input.titleSponsorSide === 'suffix')
      ? input.titleSponsorSide
      : null;

    if (!abbreviation) {
      throw new Error('隊伍縮寫不可為空');
    }
    if (!name) {
      throw new Error('隊伍名稱不可為空');
    }
    if (!Number.isFinite(salaryCap) || salaryCap <= 0) {
      throw new Error('工資帽必須大於 0');
    }

    return {
      abbreviation,
      name,
      leagueTier: input.leagueTier,
      salaryCap: Math.round(salaryCap),
      logoUrl,
      titleSponsor: sponsor,
      titleSponsorSide: side,
    };
  }

  private assertUniqueAbbreviation(abbreviation: string, excludeTeamId?: string): void {
    const duplicated = this.teams().some(
      (team) =>
        team.abbreviation.toLowerCase() === abbreviation.toLowerCase() &&
        team.id !== excludeTeamId,
    );

    if (duplicated) {
      throw new Error('同一宇宙內隊伍縮寫不可重複');
    }
  }
}
