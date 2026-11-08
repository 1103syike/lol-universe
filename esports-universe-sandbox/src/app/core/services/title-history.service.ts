import { Injectable, effect, inject } from '@angular/core';
import type { CareerSeasonRecord } from '../models/player.model';
import type { PlayoffSeriesView } from '../models/playoff-board.model';
import { MsiBoardService } from './msi-board.service';
import { PlayoffBoardService, type PlayoffLeague } from './playoff-board.service';
import { StorageAdapter } from '../storage/storage.adapter';
import { SeasonClockService } from './season-clock.service';
import { UniverseService } from './universe.service';

interface TitleGrant {
  id: string;
  label: string;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
}

interface TitleRoster {
  teamName: string;
  playerIds: string[];
  coachId: string | null;
}

interface PersonRecord {
  id: string;
  teamId: string | null;
  careerRecords: CareerSeasonRecord[];
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class TitleHistoryService {
  private readonly universeService = inject(UniverseService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly msi = inject(MsiBoardService);
  private readonly clock = inject(SeasonClockService);
  private readonly storage = inject(StorageAdapter);

  constructor() {
    effect(() => {
      this.sync();
    });
  }

  private sync(): void {
    const universe = this.universeService.activeUniverse();
    if (!universe) {
      return;
    }
    const grants = this.grants();
    const rosters = this.freezeRosters(universe.id, grants);
    const players = this.applyPeople(universe.players, grants, rosters);
    const coaches = this.applyPeople(universe.coaches, grants, rosters);
    if (!players.changed && !coaches.changed) {
      return;
    }
    this.universeService.patchActiveUniverse({
      players: players.next,
      coaches: coaches.next,
    });
  }

  private grants(): TitleGrant[] {
    const year = this.clock.year();
    const grants: TitleGrant[] = [];
    for (const league of ['TCS', 'TCL'] as const) {
      grants.push(...this.springGrants(year, league));
    }
    for (const finish of this.msi.finishRecords()) {
      grants.push({
        id: `title-${year}-msi-${finish.place}-${finish.teamId}`,
        label: `${year} MSI ${finish.place}`,
        teamId: finish.teamId,
        teamName: finish.name,
        wins: finish.wins,
        losses: finish.losses,
      });
    }
    return grants;
  }

  private springGrants(year: number, league: PlayoffLeague): TitleGrant[] {
    const series = this.playoff.bundle(league).series;
    return springFinishes(series).map((finish) => {
      const line = seriesGames(series, finish.teamId);
      return {
        id: `title-${year}-${league}-${finish.place}-${finish.teamId}`,
        label: `${year} ${league} 春季${finish.place}`,
        teamId: finish.teamId,
        teamName: finish.teamName,
        wins: line.wins,
        losses: line.losses,
      };
    });
  }

  private freezeRosters(universeId: string, grants: TitleGrant[]): Map<string, TitleRoster> {
    const key = `eus.title-roster.${universeId}`;
    const stored = this.storage.getItem<Record<string, TitleRoster>>(key) ?? {};
    const next: Record<string, TitleRoster> = {};
    let changed = Object.keys(stored).length !== grants.length;
    for (const grant of grants) {
      const current = stored[grant.id];
      if (current && current.teamName === grant.teamName) {
        next[grant.id] = current;
        continue;
      }
      next[grant.id] = this.capture(grant.teamId, grant.teamName);
      changed = true;
    }
    if (changed) {
      this.storage.setItem(key, next);
    }
    return new Map(Object.entries(next));
  }

  private capture(teamId: string, teamName: string): TitleRoster {
    const universe = this.universeService.activeUniverse();
    const coach = universe?.coaches.find((person) => person.teamId === teamId) ?? null;
    return {
      teamName,
      playerIds: (universe?.players ?? []).filter((person) => person.teamId === teamId).map((person) => person.id),
      coachId: coach?.id ?? null,
    };
  }

  private applyPeople<T extends PersonRecord>(
    people: T[],
    grants: TitleGrant[],
    rosters: Map<string, TitleRoster>,
  ): { next: T[]; changed: boolean } {
    let changed = false;
    const next = people.map((person) => {
      const before = this.signature(person.careerRecords);
      const records = this.nextRecords(person, grants, rosters);
      if (before === this.signature(records)) {
        return person;
      }
      changed = true;
      return { ...person, careerRecords: records, updatedAt: new Date().toISOString() };
    });
    return { next, changed };
  }

  private nextRecords(
    person: PersonRecord,
    grants: TitleGrant[],
    rosters: Map<string, TitleRoster>,
  ): CareerSeasonRecord[] {
    const records: CareerSeasonRecord[] = [];
    for (const record of person.careerRecords) {
      if (!record.id.startsWith('title-')) {
        records.push(record);
        continue;
      }
      const grant = grants.find((item) => item.id === record.id);
      const roster = grant ? rosters.get(grant.id) : null;
      if (!grant || !roster || !this.wasOnRoster(person.id, roster)) {
        continue;
      }
      records.push(this.recordFrom(grant));
    }
    for (const grant of grants) {
      if (records.some((record) => record.id === grant.id)) {
        continue;
      }
      const roster = rosters.get(grant.id);
      if (!roster || !this.wasOnRoster(person.id, roster)) {
        continue;
      }
      records.push(this.recordFrom(grant));
    }
    return records;
  }

  private wasOnRoster(personId: string, roster: TitleRoster): boolean {
    return roster.coachId === personId || roster.playerIds.includes(personId);
  }

  private recordFrom(grant: TitleGrant): CareerSeasonRecord {
    return {
      id: grant.id,
      seasonLabel: grant.label,
      teamName: grant.teamName,
      games: grant.wins + grant.losses,
      wins: grant.wins,
      losses: grant.losses,
    };
  }

  private signature(records: CareerSeasonRecord[]): string {
    return records
      .map((record) => `${record.id}|${record.seasonLabel}|${record.teamName}|${record.wins}|${record.losses}|${record.games}`)
      .join(';');
  }
}

function springFinishes(series: PlayoffSeriesView[]): Array<{ place: '冠軍' | '亞軍' | '四強'; teamId: string; teamName: string }> {
  const finishes: Array<{ place: '冠軍' | '亞軍' | '四強'; teamId: string; teamName: string }> = [];
  for (const id of ['sf-1', 'sf-2']) {
    const match = series.find((item) => item.id === id);
    if (!match || match.status !== 'done' || !match.left || !match.right) {
      continue;
    }
    const loser = match.left.isWinner ? match.right : match.left;
    finishes.push({ place: '四強', teamId: loser.teamId, teamName: loser.name });
  }
  const final = series.find((item) => item.id === 'final');
  if (!final || final.status !== 'done' || !final.left || !final.right) {
    return finishes;
  }
  const winner = final.left.isWinner ? final.left : final.right;
  const loser = final.left.isWinner ? final.right : final.left;
  finishes.push({ place: '冠軍', teamId: winner.teamId, teamName: winner.name });
  finishes.push({ place: '亞軍', teamId: loser.teamId, teamName: loser.name });
  return finishes;
}

function seriesGames(series: PlayoffSeriesView[], teamId: string): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  for (const match of series) {
    if (match.status !== 'done' || !match.left || !match.right) {
      continue;
    }
    let own: PlayoffSeriesView['left'] = null;
    let other: PlayoffSeriesView['right'] = null;
    if (match.left.teamId === teamId) {
      own = match.left;
      other = match.right;
    } else if (match.right.teamId === teamId) {
      own = match.right;
      other = match.left;
    }
    if (!own || !other) {
      continue;
    }
    wins += own.games ?? 0;
    losses += other.games ?? 0;
  }
  return { wins, losses };
}
