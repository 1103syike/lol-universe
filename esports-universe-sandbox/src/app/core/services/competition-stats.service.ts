import { Injectable, inject, signal } from '@angular/core';
import type { PlayerPosition } from '../models/player.model';
import {
  STATS_COMPETITIONS,
  STATS_SPLIT_LABELS,
  type ChampionStatsRow,
  type PlayerStatsRow,
  type StatsCompetition,
  type StatsPeriodId,
  type StatsPeriodOption,
  type StatsSplit,
} from '../models/competition-stats.model';
import type { MatchReport } from '../../shared/sim';
import { getMsiGuestBundle } from '../data/msi-guest-roster';
import { fixedRegular } from '../../shared/utils/year-calendar';
import { StorageAdapter } from '../storage/storage.adapter';
import { SeasonClockService } from './season-clock.service';
import { TeamService } from './team.service';
import { UniverseService } from './universe.service';

interface StoredPlayerAgg {
  playerId: string;
  gamertag: string;
  teamId: string;
  position: PlayerPosition;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  gold: number;
  cs: number;
  vision: number;
  kpSum: number;
  durationSecSum: number;
}

interface StoredChampAgg {
  championId: string;
  championNameZh: string;
  picks: number;
  bans: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  gold: number;
  cs: number;
  durationSecSum: number;
}

interface CompetitionBucket {
  gamesPlayed: number;
  players: Record<string, StoredPlayerAgg>;
  champions: Record<string, StoredChampAgg>;
}

interface StatsArchiveV2 {
  version: 2;
  buckets: Record<string, CompetitionBucket>;
}

interface LegacyYearProgress {
  year: number;
  competitions: Record<StatsCompetition, CompetitionBucket>;
}

function emptyBucket(): CompetitionBucket {
  return { gamesPlayed: 0, players: {}, champions: {} };
}

function kdaValue(kills: number, deaths: number, assists: number): number {
  if (deaths <= 0) {
    return kills + assists;
  }
  return (kills + assists) / deaths;
}

function perMinute(total: number, durationSecSum: number, games: number): number {
  if (durationSecSum > 0) {
    return (total / durationSecSum) * 60;
  }
  if (games <= 0) {
    return 0;
  }
  return total / games;
}

function mergePlayer(into: StoredPlayerAgg | undefined, from: StoredPlayerAgg): StoredPlayerAgg {
  return {
    playerId: from.playerId,
    gamertag: from.gamertag,
    teamId: from.teamId,
    position: from.position,
    games: (into?.games ?? 0) + from.games,
    wins: (into?.wins ?? 0) + from.wins,
    kills: (into?.kills ?? 0) + from.kills,
    deaths: (into?.deaths ?? 0) + from.deaths,
    assists: (into?.assists ?? 0) + from.assists,
    damage: (into?.damage ?? 0) + from.damage,
    gold: (into?.gold ?? 0) + from.gold,
    cs: (into?.cs ?? 0) + from.cs,
    vision: (into?.vision ?? 0) + from.vision,
    kpSum: (into?.kpSum ?? 0) + from.kpSum,
    durationSecSum: (into?.durationSecSum ?? 0) + from.durationSecSum,
  };
}

function mergeChamp(into: StoredChampAgg | undefined, from: StoredChampAgg): StoredChampAgg {
  return {
    championId: from.championId,
    championNameZh: from.championNameZh,
    picks: (into?.picks ?? 0) + from.picks,
    bans: (into?.bans ?? 0) + from.bans,
    wins: (into?.wins ?? 0) + from.wins,
    kills: (into?.kills ?? 0) + from.kills,
    deaths: (into?.deaths ?? 0) + from.deaths,
    assists: (into?.assists ?? 0) + from.assists,
    damage: (into?.damage ?? 0) + from.damage,
    gold: (into?.gold ?? 0) + from.gold,
    cs: (into?.cs ?? 0) + from.cs,
    durationSecSum: (into?.durationSecSum ?? 0) + from.durationSecSum,
  };
}

function mergeBuckets(list: CompetitionBucket[]): CompetitionBucket {
  const out = emptyBucket();
  for (const bucket of list) {
    out.gamesPlayed += bucket.gamesPlayed;
    for (const player of Object.values(bucket.players)) {
      out.players[player.playerId] = mergePlayer(out.players[player.playerId], player);
    }
    for (const champ of Object.values(bucket.champions)) {
      out.champions[champ.championId] = mergeChamp(out.champions[champ.championId], champ);
    }
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class CompetitionStatsService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly teams = inject(TeamService);
  private readonly revision = signal(0);

  record(report: MatchReport, competition: StatsCompetition | null | undefined): void {
    if (!competition || !STATS_COMPETITIONS.includes(competition)) {
      return;
    }
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    const dateIso = this.universeService.activeUniverse()?.currentDate ?? '';
    if (!universeId || !year) {
      return;
    }

    const archive = this.readArchive(universeId);
    const key = this.bucketKey(year, competition, dateIso);
    const bucket = archive.buckets[key] ?? emptyBucket();
    bucket.gamesPlayed += 1;

    const durationSec = Math.max(report.boxScore.durationSec, 1);
    const pickByPlayer = new Map<string, { championId: string; championNameZh: string }>();
    for (const pick of [...report.draft.home.picks, ...report.draft.away.picks]) {
      pickByPlayer.set(pick.playerId, {
        championId: pick.championId,
        championNameZh: pick.championNameZh,
      });
    }

    for (const player of report.boxScore.players) {
      const won = player.teamId === report.winnerTeamId;
      const existing = bucket.players[player.playerId];
      bucket.players[player.playerId] = {
        playerId: player.playerId,
        gamertag: player.gamertag,
        teamId: player.teamId,
        position: player.position,
        games: (existing?.games ?? 0) + 1,
        wins: (existing?.wins ?? 0) + (won ? 1 : 0),
        kills: (existing?.kills ?? 0) + player.kills,
        deaths: (existing?.deaths ?? 0) + player.deaths,
        assists: (existing?.assists ?? 0) + player.assists,
        damage: (existing?.damage ?? 0) + player.damageToChamps,
        gold: (existing?.gold ?? 0) + player.gold,
        cs: (existing?.cs ?? 0) + player.cs,
        vision: (existing?.vision ?? 0) + player.visionScore,
        kpSum: (existing?.kpSum ?? 0) + player.kpPct,
        durationSecSum: (existing?.durationSecSum ?? 0) + durationSec,
      };

      const pick = pickByPlayer.get(player.playerId);
      if (!pick) {
        continue;
      }
      const champ = bucket.champions[pick.championId];
      bucket.champions[pick.championId] = {
        championId: pick.championId,
        championNameZh: pick.championNameZh,
        picks: (champ?.picks ?? 0) + 1,
        bans: champ?.bans ?? 0,
        wins: (champ?.wins ?? 0) + (won ? 1 : 0),
        kills: (champ?.kills ?? 0) + player.kills,
        deaths: (champ?.deaths ?? 0) + player.deaths,
        assists: (champ?.assists ?? 0) + player.assists,
        damage: (champ?.damage ?? 0) + player.damageToChamps,
        gold: (champ?.gold ?? 0) + player.gold,
        cs: (champ?.cs ?? 0) + player.cs,
        durationSecSum: (champ?.durationSecSum ?? 0) + durationSec,
      };
    }

    for (const ban of report.draft.bans) {
      const champ = bucket.champions[ban.championId];
      bucket.champions[ban.championId] = {
        championId: ban.championId,
        championNameZh: ban.championNameZh,
        picks: champ?.picks ?? 0,
        bans: (champ?.bans ?? 0) + 1,
        wins: champ?.wins ?? 0,
        kills: champ?.kills ?? 0,
        deaths: champ?.deaths ?? 0,
        assists: champ?.assists ?? 0,
        damage: champ?.damage ?? 0,
        gold: champ?.gold ?? 0,
        cs: champ?.cs ?? 0,
        durationSecSum: champ?.durationSecSum ?? 0,
      };
    }

    archive.buckets[key] = bucket;
    this.storage.setItem(this.storageKey(universeId), archive);
    this.revision.update((value) => value + 1);
  }

  periodOptions(): StatsPeriodOption[] {
    this.revision();
    this.clock.year();
    this.universeService.activeUniverseId();
    const universeId = this.universeService.activeUniverseId();
    const currentYear = this.clock.year();
    const years = new Set<number>();
    if (currentYear > 0) {
      years.add(currentYear);
    }
    if (universeId) {
      for (const key of Object.keys(this.readArchive(universeId).buckets)) {
        const year = Number(key.split(':')[0]);
        if (Number.isInteger(year) && year > 0) {
          years.add(year);
        }
      }
    }
    const ordered = [...years].sort((left, right) => right - left);
    const options: StatsPeriodOption[] = [{ id: 'career', label: '全生涯', kind: 'career' }];
    for (const year of ordered) {
      options.push({
        id: `${year}-spring`,
        label: `${year} ${STATS_SPLIT_LABELS.spring}`,
        kind: 'season',
        year,
        split: 'spring',
      });
      options.push({
        id: `${year}-msi`,
        label: `${year} MSI`,
        kind: 'msi',
        year,
      });
      if (fixedRegular(year, 'summerRegular') || this.hasBucketPrefix(universeId, `${year}:summer:`)) {
        options.push({
          id: `${year}-summer`,
          label: `${year} ${STATS_SPLIT_LABELS.summer}`,
          kind: 'season',
          year,
          split: 'summer',
        });
      }
    }
    return options;
  }

  competitionsForPeriod(periodId: StatsPeriodId): StatsCompetition[] {
    if (periodId.endsWith('-msi')) {
      return ['MSI'];
    }
    if (periodId === 'career') {
      return [...STATS_COMPETITIONS];
    }
    return ['TCS', 'TCL'];
  }

  playersFor(competition: StatsCompetition, periodId: StatsPeriodId = 'career'): PlayerStatsRow[] {
    this.revision();
    this.clock.year();
    this.universeService.activeUniverseId();
    return this.buildPlayerRows(this.bucketFor(competition, periodId));
  }

  championsFor(competition: StatsCompetition, periodId: StatsPeriodId = 'career'): ChampionStatsRow[] {
    this.revision();
    this.clock.year();
    this.universeService.activeUniverseId();
    return this.buildChampionRows(this.bucketFor(competition, periodId));
  }

  gamesPlayed(competition: StatsCompetition, periodId: StatsPeriodId = 'career'): number {
    this.revision();
    this.clock.year();
    this.universeService.activeUniverseId();
    return this.bucketFor(competition, periodId).gamesPlayed;
  }

  currentPeriodId(): StatsPeriodId {
    const year = this.clock.year();
    if (!year) {
      return 'career';
    }
    const dateIso = this.universeService.activeUniverse()?.currentDate ?? '';
    const split = this.resolveSplit(year, dateIso);
    return `${year}-${split}`;
  }

  private bucketFor(competition: StatsCompetition, periodId: StatsPeriodId): CompetitionBucket {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return emptyBucket();
    }
    const archive = this.readArchive(universeId);
    if (periodId === 'career') {
      const keys = Object.keys(archive.buckets).filter((key) => key.endsWith(`:${competition}`));
      return mergeBuckets(keys.map((key) => archive.buckets[key] ?? emptyBucket()));
    }
    if (periodId.endsWith('-msi')) {
      const year = Number(periodId.slice(0, 4));
      if (competition !== 'MSI' || !Number.isInteger(year)) {
        return emptyBucket();
      }
      return archive.buckets[`${year}:msi:MSI`] ?? emptyBucket();
    }
    const [yearText, split] = periodId.split('-');
    const year = Number(yearText);
    if (!Number.isInteger(year) || (split !== 'spring' && split !== 'summer')) {
      return emptyBucket();
    }
    if (competition === 'MSI') {
      return emptyBucket();
    }
    return archive.buckets[`${year}:${split}:${competition}`] ?? emptyBucket();
  }

  private bucketKey(year: number, competition: StatsCompetition, dateIso: string): string {
    if (competition === 'MSI') {
      return `${year}:msi:MSI`;
    }
    return `${year}:${this.resolveSplit(year, dateIso)}:${competition}`;
  }

  private resolveSplit(year: number, dateIso: string): StatsSplit {
    const summer = fixedRegular(year, 'summerRegular');
    if (summer && dateIso && dateIso >= summer) {
      return 'summer';
    }
    return 'spring';
  }

  private hasBucketPrefix(universeId: string | null, prefix: string): boolean {
    if (!universeId) {
      return false;
    }
    return Object.keys(this.readArchive(universeId).buckets).some((key) => key.startsWith(prefix));
  }

  private buildPlayerRows(bucket: CompetitionBucket): PlayerStatsRow[] {
    return Object.values(bucket.players)
      .slice()
      .sort(
        (left, right) =>
          right.games - left.games ||
          right.wins - left.wins ||
          left.gamertag.localeCompare(right.gamertag),
      )
      .map((row, index) => {
        const team = this.resolveTeam(row.teamId);
        const losses = row.games - row.wins;
        return {
          rank: index + 1,
          playerId: row.playerId,
          gamertag: row.gamertag,
          teamId: row.teamId,
          abbreviation: team.abbreviation,
          teamName: team.name,
          logoUrl: team.logoUrl,
          position: row.position,
          games: row.games,
          wins: row.wins,
          losses,
          winRate: row.games > 0 ? (row.wins / row.games) * 100 : 0,
          kills: row.games > 0 ? row.kills / row.games : 0,
          deaths: row.games > 0 ? row.deaths / row.games : 0,
          assists: row.games > 0 ? row.assists / row.games : 0,
          kda: kdaValue(row.kills, row.deaths, row.assists),
          kpPct: row.games > 0 ? row.kpSum / row.games : 0,
          csm: perMinute(row.cs, row.durationSecSum, row.games),
          dpm: perMinute(row.damage, row.durationSecSum, row.games),
          gpm: perMinute(row.gold, row.durationSecSum, row.games),
          vspm: perMinute(row.vision, row.durationSecSum, row.games),
        };
      });
  }

  private buildChampionRows(bucket: CompetitionBucket): ChampionStatsRow[] {
    const totalGames = Math.max(bucket.gamesPlayed, 1);
    return Object.values(bucket.champions)
      .slice()
      .sort(
        (left, right) =>
          right.picks + right.bans - (left.picks + left.bans) ||
          right.picks - left.picks ||
          left.championNameZh.localeCompare(right.championNameZh),
      )
      .map((row, index) => ({
        rank: index + 1,
        championId: row.championId,
        championNameZh: row.championNameZh,
        picks: row.picks,
        bans: row.bans,
        presence: ((row.picks + row.bans) / totalGames) * 100,
        wins: row.wins,
        winRate: row.picks > 0 ? (row.wins / row.picks) * 100 : 0,
        kills: row.picks > 0 ? row.kills / row.picks : 0,
        deaths: row.picks > 0 ? row.deaths / row.picks : 0,
        assists: row.picks > 0 ? row.assists / row.picks : 0,
        kda: kdaValue(row.kills, row.deaths, row.assists),
        csm: perMinute(row.cs, row.durationSecSum, row.picks),
        dpm: perMinute(row.damage, row.durationSecSum, row.picks),
        gpm: perMinute(row.gold, row.durationSecSum, row.picks),
      }));
  }

  private resolveTeam(teamId: string): {
    abbreviation: string;
    name: string;
    logoUrl: string | null;
  } {
    const team = this.teams.getTeamById(teamId);
    if (team) {
      return {
        abbreviation: team.abbreviation,
        name: team.name,
        logoUrl: team.logoUrl,
      };
    }
    const guest = getMsiGuestBundle(teamId)?.guest;
    if (guest) {
      return {
        abbreviation: guest.abbreviation,
        name: guest.name,
        logoUrl: guest.logoUrl,
      };
    }
    return { abbreviation: '—', name: '', logoUrl: null };
  }

  private readArchive(universeId: string): StatsArchiveV2 {
    const stored = this.storage.getItem<StatsArchiveV2 | LegacyYearProgress>(this.storageKey(universeId));
    if (!stored) {
      return { version: 2, buckets: {} };
    }
    if ('version' in stored && stored.version === 2) {
      return {
        version: 2,
        buckets: { ...(stored.buckets ?? {}) },
      };
    }
    const legacy = stored as LegacyYearProgress;
    if (!legacy.year || !legacy.competitions) {
      return { version: 2, buckets: {} };
    }
    const buckets: Record<string, CompetitionBucket> = {};
    for (const competition of STATS_COMPETITIONS) {
      const bucket = legacy.competitions[competition];
      if (!bucket) {
        continue;
      }
      const key =
        competition === 'MSI'
          ? `${legacy.year}:msi:MSI`
          : `${legacy.year}:spring:${competition}`;
      buckets[key] = {
        gamesPlayed: bucket.gamesPlayed ?? 0,
        players: { ...(bucket.players ?? {}) },
        champions: { ...(bucket.champions ?? {}) },
      };
    }
    const migrated: StatsArchiveV2 = { version: 2, buckets };
    this.storage.setItem(this.storageKey(universeId), migrated);
    return migrated;
  }

  private storageKey(universeId: string): string {
    return `eus.comp-stats.${universeId}`;
  }
}
