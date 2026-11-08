import { Injectable, inject, signal } from '@angular/core';
import {
  MSI_2021_GROUP_MATCHES,
  MSI_2021_GROUPS,
  MSI_2021_GUESTS,
  MSI_PCS_SLOT,
  type MsiRosterPlayer,
} from '../data/msi-2021';
import type { PlayoffSide } from '../models/playoff-board.model';
import { StorageAdapter } from '../storage/storage.adapter';
import { PlayoffBoardService } from './playoff-board.service';
import { PromotionBoardService } from './promotion-board.service';
import { SeasonClockService } from './season-clock.service';
import { UniverseService } from './universe.service';

const MSI_YEAR = 2021;
const MSI_KICKOFF = '晚上 9:00';
const GROUP_TIE_DATE = '2021-05-12';
const RUMBLE_DATES = ['2021-05-14', '2021-05-15', '2021-05-16', '2021-05-17', '2021-05-18'];
const RUMBLE_TIE_DATE = '2021-05-19';
const PICK_DATE = '2021-05-21';

export interface MsiSide {
  id: string;
  teamId: string | null;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  region: string;
  seed: string;
  roster: MsiRosterPlayer[];
}

export interface MsiTableRow {
  rank: number;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  winRate: number | null;
  note: string;
}

export interface MsiTable {
  key: string;
  title: string;
  advanceCount: number;
  rows: MsiTableRow[];
}

export interface MsiMatchView {
  id: string;
  date: string;
  kickoff: string;
  stage: string;
  label: string;
  bestOf: 1 | 5;
  left: MsiSide | null;
  right: MsiSide | null;
  leftGames: number;
  rightGames: number;
  done: boolean;
  tableTitle: string;
  table: MsiTableRow[];
  bucket: string;
}

export type MsiHero =
  | { kind: 'match'; match: MsiMatchView }
  | { kind: 'pick'; date: string; chooser: MsiSide; choices: MsiSide[] };

interface MsiFixture {
  id: string;
  date: string;
  stage: string;
  label: string;
  bestOf: 1 | 5;
  leftId: string;
  rightId: string;
  tableTitle: string;
  tableIds: string[];
  bucket: string;
}

interface MsiGame {
  leftId: string;
  rightId: string;
  left: number;
  right: number;
  winnerId: string;
  bucket: string;
}

interface MsiProgress {
  games: Record<string, MsiGame>;
  semiPickId: string;
}

interface RankedIds {
  ids: string[];
  tie: [string, string] | null;
}

export interface MsiFinish {
  place: '冠軍' | '亞軍' | '四強';
  teamId: string;
  name: string;
  date: string;
  wins: number;
  losses: number;
}

@Injectable({ providedIn: 'root' })
export class MsiBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly promotion = inject(PromotionBoardService);
  private readonly revision = signal(0);

  hero(): MsiHero | null {
    if (!this.canPlay()) {
      return null;
    }
    const progress = this.read();
    const fixtures = this.fixtures(progress);
    const open = fixtures.find((fixture) => !progress.games[fixture.id]?.winnerId);
    if (open) {
      return { kind: 'match', match: this.toView(open, progress) };
    }
    const ranked = this.rumbleRanking(progress);
    if (ranked && !progress.semiPickId) {
      const chooser = this.side(ranked[0]);
      const third = this.side(ranked[2]);
      const fourth = this.side(ranked[3]);
      if (!chooser || !third || !fourth) {
        return null;
      }
      return { kind: 'pick', date: PICK_DATE, chooser, choices: [third, fourth] };
    }
    return null;
  }

  upcoming(): MsiMatchView[] {
    if (!this.canPlay()) {
      return [];
    }
    const progress = this.read();
    const fixtures = this.fixtures(progress);
    const openIndex = fixtures.findIndex((fixture) => !progress.games[fixture.id]?.winnerId);
    if (openIndex < 0) {
      return [];
    }
    const next: MsiMatchView[] = [];
    for (const fixture of fixtures.slice(openIndex + 1)) {
      const view = this.toView(fixture, progress);
      if (!view.left || !view.right) {
        continue;
      }
      next.push(view);
      if (next.length === 3) {
        break;
      }
    }
    return next;
  }

  stageSlate(): MsiMatchView[] {
    if (!this.canPlay()) {
      return [];
    }
    const progress = this.read();
    const all = this.fixtures(progress);
    const open = all.find((fixture) => !progress.games[fixture.id]?.winnerId);
    const bucket = open?.bucket ?? (progress.semiPickId ? 'knockout' : 'rumble');
    const inGroups = bucket === 'A' || bucket === 'B' || bucket === 'C';
    return all
      .filter((fixture) => {
        if (inGroups) {
          return fixture.bucket === 'A' || fixture.bucket === 'B' || fixture.bucket === 'C';
        }
        return fixture.bucket === bucket;
      })
      .map((fixture) => this.toView(fixture, progress));
  }

  boards(): MsiTable[] {
    if (this.clock.year() !== MSI_YEAR) {
      return [];
    }
    const progress = this.read();
    const groupsDone = this.allDecided(this.groupFixtures(), progress) && !this.groupTie(progress);
    if (!groupsDone) {
      return (['A', 'B', 'C'] as const).map((group) => this.groupTable(group, progress));
    }
    return [this.rumbleTable(progress)];
  }

  onDate(iso: string): MsiMatchView[] {
    if (!iso.startsWith(`${MSI_YEAR}-`)) {
      return [];
    }
    const progress = this.read();
    return this.fixtures(progress)
      .filter((fixture) => fixture.date === iso)
      .map((fixture) => this.toView(fixture, progress));
  }

  isFinished(): boolean {
    this.revision();
    if (!this.canPlay()) {
      return false;
    }
    return Boolean(this.read().games['ko-final']?.winnerId);
  }

  championSide(): { side: MsiSide; date: string } | null {
    if (!this.isFinished()) {
      return null;
    }
    const progress = this.read();
    const winnerId = progress.games['ko-final']?.winnerId ?? '';
    const side = winnerId ? this.side(winnerId) : null;
    if (!side) {
      return null;
    }
    const date = this.fixtures(progress).find((fixture) => fixture.id === 'ko-final')?.date ?? '';
    return { side, date };
  }

  championRecord(): { teamId: string; name: string; date: string; wins: number; losses: number } | null {
    const champ = this.championSide();
    if (!champ?.side.teamId) {
      return null;
    }
    const progress = this.read();
    const line = this.tally(progress, champ.side.teamId);
    return {
      teamId: champ.side.teamId,
      name: champ.side.name,
      date: champ.date,
      wins: line.wins,
      losses: line.losses,
    };
  }

  finishRecords(): MsiFinish[] {
    this.revision();
    if (!this.canPlay()) {
      return [];
    }
    const progress = this.read();
    const marks: Array<{ place: MsiFinish['place']; id: string; date: string }> = [];
    for (const id of ['ko-sf-2', 'ko-sf-1']) {
      const game = progress.games[id];
      if (!game?.winnerId) {
        continue;
      }
      const loserId = game.winnerId === game.leftId ? game.rightId : game.leftId;
      const date = id === 'ko-sf-1' ? '2021-05-22' : '2021-05-21';
      marks.push({ place: '四強', id: loserId, date });
    }
    const final = progress.games['ko-final'];
    if (final?.winnerId) {
      const loserId = final.winnerId === final.leftId ? final.rightId : final.leftId;
      marks.push({ place: '冠軍', id: final.winnerId, date: '2021-05-23' });
      marks.push({ place: '亞軍', id: loserId, date: '2021-05-23' });
    }
    const finishes: MsiFinish[] = [];
    for (const mark of marks) {
      const side = this.side(mark.id);
      if (!side?.teamId || !mark.date) {
        continue;
      }
      const line = this.tally(progress, side.teamId);
      finishes.push({
        place: mark.place,
        teamId: side.teamId,
        name: side.name,
        date: mark.date,
        wins: line.wins,
        losses: line.losses,
      });
    }
    return finishes;
  }

  private tally(progress: MsiProgress, teamId: string): { wins: number; losses: number } {
    let wins = 0;
    let losses = 0;
    for (const game of Object.values(progress.games)) {
      if (!game.winnerId) {
        continue;
      }
      const left = this.side(game.leftId);
      const right = this.side(game.rightId);
      if (left?.teamId !== teamId && right?.teamId !== teamId) {
        continue;
      }
      if (left?.teamId === teamId) {
        wins += game.left;
        losses += game.right;
      } else {
        wins += game.right;
        losses += game.left;
      }
    }
    return { wins, losses };
  }

  addGame(matchId: string, sideId: string): void {
    const current = this.hero();
    if (current?.kind !== 'match' || current.match.id !== matchId || current.match.done) {
      return;
    }
    const left = current.match.left;
    const right = current.match.right;
    if (!left || !right || (sideId !== left.id && sideId !== right.id)) {
      return;
    }
    const progress = this.read();
    const previous = progress.games[matchId];
    const leftGames = (previous?.left ?? 0) + (sideId === left.id ? 1 : 0);
    const rightGames = (previous?.right ?? 0) + (sideId === right.id ? 1 : 0);
    const target = current.match.bestOf === 1 ? 1 : 3;
    let winnerId = '';
    if (leftGames >= target) {
      winnerId = left.id;
    } else if (rightGames >= target) {
      winnerId = right.id;
    }
    this.write({
      ...progress,
      games: {
        ...progress.games,
        [matchId]: {
          leftId: left.id,
          rightId: right.id,
          left: leftGames,
          right: rightGames,
          winnerId,
          bucket: current.match.bucket,
        },
      },
    });
  }

  pickSemi(sideId: string): void {
    const current = this.hero();
    if (current?.kind !== 'pick' || !current.choices.some((choice) => choice.id === sideId)) {
      return;
    }
    const progress = this.read();
    if (progress.semiPickId) {
      return;
    }
    this.write({ ...progress, semiPickId: sideId });
  }

  private canPlay(): boolean {
    this.revision();
    return this.clock.year() === MSI_YEAR && this.promotion.isDone('spring') && Boolean(this.champion());
  }

  private fixtures(progress: MsiProgress): MsiFixture[] {
    const group = this.groupFixtures();
    if (!this.allDecided(group, progress)) {
      return group;
    }
    const groupTie = this.groupTie(progress);
    if (groupTie) {
      return [...group, groupTie];
    }
    const rumble = this.rumbleFixtures(progress);
    if (rumble.length === 0 || !this.allDecided(rumble, progress)) {
      return [...group, ...rumble];
    }
    const rumbleTie = this.rumbleTie(progress);
    if (rumbleTie) {
      return [...group, ...rumble, rumbleTie];
    }
    return [...group, ...rumble, ...this.knockoutFixtures(progress)];
  }

  private groupFixtures(): MsiFixture[] {
    return MSI_2021_GROUP_MATCHES.map((match) => ({
      id: match.id,
      date: match.date,
      stage: '小組賽',
      label: this.groupDayLabel(match.group, match.date),
      bestOf: 1,
      leftId: match.leftId,
      rightId: match.rightId,
      tableTitle: `${match.group} 組`,
      tableIds: MSI_2021_GROUPS[match.group],
      bucket: match.group,
    }));
  }

  private groupDayLabel(group: 'A' | 'B' | 'C', date: string): string {
    const dates: string[] = [];
    for (const match of MSI_2021_GROUP_MATCHES) {
      if (match.group === group && !dates.includes(match.date)) {
        dates.push(match.date);
      }
    }
    const day = dates.indexOf(date) + 1;
    return day > 0 ? `${group}組 D${day}` : `${group}組`;
  }

  private groupTie(progress: MsiProgress): MsiFixture | null {
    for (const group of ['A', 'B', 'C'] as const) {
      const ranked = this.orderIds(MSI_2021_GROUPS[group], this.gamesIn(progress, group), 2);
      if (!ranked.tie) {
        continue;
      }
      return this.tieFixture(`tb-g-${group}`, GROUP_TIE_DATE, '小組賽', `${group}組 加賽`, ranked.tie, MSI_2021_GROUPS[group], group);
    }
    return null;
  }

  private rumbleFixtures(progress: MsiProgress): MsiFixture[] {
    const ids = this.rumbleIds(progress);
    if (ids.length !== 6) {
      return [];
    }
    const pairs = this.doubleRoundRobin(ids);
    return pairs.map((pair, index) => {
      const date = RUMBLE_DATES[Math.floor(index / 6)] ?? RUMBLE_DATES[RUMBLE_DATES.length - 1];
      const day = RUMBLE_DATES.indexOf(date) + 1;
      return {
      id: `r-${index + 1}`,
      date,
      stage: '亂鬥賽',
      label: day > 0 ? `D${day}` : '加賽',
      bestOf: 1,
      leftId: pair.leftId,
      rightId: pair.rightId,
      tableTitle: '亂鬥賽',
      tableIds: ids,
      bucket: 'rumble',
    };
    });
  }

  private rumbleTie(progress: MsiProgress): MsiFixture | null {
    const ids = this.rumbleIds(progress);
    const ranked = this.orderIds(ids, this.gamesIn(progress, 'rumble'), 4);
    if (!ranked.tie) {
      return null;
    }
    return this.tieFixture('tb-r', RUMBLE_TIE_DATE, '亂鬥賽', '加賽', ranked.tie, ids, 'rumble');
  }

  private knockoutFixtures(progress: MsiProgress): MsiFixture[] {
    const ranked = this.rumbleRanking(progress);
    if (!ranked || ranked.length < 4 || !progress.semiPickId) {
      return [];
    }
    const first = ranked[0];
    const second = ranked[1];
    const third = ranked[2];
    const fourth = ranked[3];
    const picked = progress.semiPickId === third || progress.semiPickId === fourth ? progress.semiPickId : fourth;
    const other = picked === third ? fourth : third;
    const semis: MsiFixture[] = [
      this.knockoutFixture('ko-sf-2', '2021-05-21', '四強', second, other),
      this.knockoutFixture('ko-sf-1', '2021-05-22', '四強', first, picked),
    ];
    const finalLeft = progress.games['ko-sf-2']?.winnerId ?? '';
    const finalRight = progress.games['ko-sf-1']?.winnerId ?? '';
    return [...semis, this.knockoutFixture('ko-final', '2021-05-23', '決賽', finalLeft, finalRight)];
  }

  private rumbleRanking(progress: MsiProgress): string[] | null {
    if (this.groupTie(progress) || this.rumbleIds(progress).length < 6) {
      return null;
    }
    const rumble = this.rumbleFixtures(progress);
    if (!this.allDecided(rumble, progress)) {
      return null;
    }
    const ranked = this.orderIds(this.rumbleIds(progress), this.gamesIn(progress, 'rumble'), 4);
    if (ranked.tie) {
      return null;
    }
    return ranked.ids;
  }

  private rumbleIds(progress: MsiProgress): string[] {
    const ids: string[] = [];
    for (const group of ['A', 'B', 'C'] as const) {
      const games = this.gamesIn(progress, group);
      const ranked = this.orderIds(MSI_2021_GROUPS[group], games, 2);
      ids.push(this.resolveId(ranked.ids[0] ?? ''), this.resolveId(ranked.ids[1] ?? ''));
    }
    return ids.filter((id) => id.length > 0);
  }

  private tieFixture(prefix: string, date: string, stage: string, label: string, tie: [string, string], tableIds: string[], bucket: string): MsiFixture {
    const leftId = this.resolveId(tie[0]);
    const rightId = this.resolveId(tie[1]);
    return {
      id: `${prefix}-${leftId}-${rightId}`,
      date,
      stage,
      label,
      bestOf: 1,
      leftId,
      rightId,
      tableTitle: label,
      tableIds,
      bucket,
    };
  }

  private knockoutFixture(id: string, date: string, label: string, leftId: string, rightId: string): MsiFixture {
    return {
      id,
      date,
      stage: '淘汰賽',
      label,
      bestOf: 5,
      leftId,
      rightId,
      tableTitle: '',
      tableIds: [],
      bucket: 'knockout',
    };
  }

  private allDecided(fixtures: MsiFixture[], progress: MsiProgress): boolean {
    return fixtures.every((fixture) => Boolean(progress.games[fixture.id]?.winnerId));
  }

  private orderIds(slotIds: string[], games: Record<string, MsiGame>, boundary: number): RankedIds {
    const rows = slotIds.map((slotId) => {
      const id = this.resolveId(slotId);
      return { id, wins: this.winCount(id, games) };
    });
    rows.sort((left, right) => right.wins - left.wins || left.id.localeCompare(right.id));
    let moved = true;
    let guard = 0;
    while (moved && guard < 12) {
      moved = false;
      guard += 1;
      for (let index = 0; index < rows.length - 1; index += 1) {
        if (rows[index].wins !== rows[index + 1].wins) {
          continue;
        }
        if (this.headToHead(rows[index].id, rows[index + 1].id, games) < 0) {
          const swap = rows[index];
          rows[index] = rows[index + 1];
          rows[index + 1] = swap;
          moved = true;
        }
      }
    }
    const limit = Math.min(rows.length - 1, boundary);
    for (let index = 0; index < limit; index += 1) {
      if (rows[index].wins !== rows[index + 1].wins) {
        continue;
      }
      if (this.headToHead(rows[index].id, rows[index + 1].id, games) === 0) {
        return { ids: rows.map((row) => row.id), tie: [rows[index].id, rows[index + 1].id] };
      }
    }
    return { ids: rows.map((row) => row.id), tie: null };
  }

  private gamesIn(progress: MsiProgress, bucket: string): Record<string, MsiGame> {
    const picked: Record<string, MsiGame> = {};
    for (const [id, game] of Object.entries(progress.games)) {
      if (game.bucket === bucket) {
        picked[id] = game;
      }
    }
    return picked;
  }

  private winCount(id: string, games: Record<string, MsiGame>): number {
    let wins = 0;
    for (const game of Object.values(games)) {
      if (game.winnerId === id) {
        wins += 1;
      }
    }
    return wins;
  }

  private lossCount(id: string, games: Record<string, MsiGame>): number {
    let losses = 0;
    for (const game of Object.values(games)) {
      if (game.winnerId && game.winnerId !== id && (game.leftId === id || game.rightId === id)) {
        losses += 1;
      }
    }
    return losses;
  }

  private headToHead(leftId: string, rightId: string, games: Record<string, MsiGame>): number {
    let leftWins = 0;
    let rightWins = 0;
    for (const game of Object.values(games)) {
      const played = (game.leftId === leftId && game.rightId === rightId) || (game.leftId === rightId && game.rightId === leftId);
      if (!played || !game.winnerId) {
        continue;
      }
      if (game.winnerId === leftId) {
        leftWins += 1;
      }
      if (game.winnerId === rightId) {
        rightWins += 1;
      }
    }
    if (leftWins === rightWins) {
      return 0;
    }
    return leftWins > rightWins ? 1 : -1;
  }

  private doubleRoundRobin(ids: string[]): { leftId: string; rightId: string }[] {
    if (ids.length < 2) {
      return [];
    }
    const fixed = ids[0];
    const rotation = ids.slice(1);
    const first: { leftId: string; rightId: string }[] = [];
    for (let round = 0; round < ids.length - 1; round += 1) {
      const row = [fixed, ...rotation];
      const half = ids.length / 2;
      for (let index = 0; index < half; index += 1) {
        const home = row[index];
        const away = row[ids.length - 1 - index];
        if (round % 2 === 0) {
          first.push({ leftId: home, rightId: away });
        } else {
          first.push({ leftId: away, rightId: home });
        }
      }
      const moved = rotation.pop();
      if (moved) {
        rotation.unshift(moved);
      }
    }
    const second = first.map((pair) => ({ leftId: pair.rightId, rightId: pair.leftId }));
    return [...first, ...second];
  }

  private groupTable(group: 'A' | 'B' | 'C', progress: MsiProgress): MsiTable {
    const games = this.gamesIn(progress, group);
    const ids = this.orderIds(MSI_2021_GROUPS[group], games, 0).ids;
    return {
      key: group,
      title: `${group} 組`,
      advanceCount: 2,
      rows: this.tableRows(ids, games),
    };
  }

  private rumbleTable(progress: MsiProgress): MsiTable {
    const games = this.gamesIn(progress, 'rumble');
    const ids = this.orderIds(this.rumbleIds(progress), games, 0).ids;
    return {
      key: 'rumble',
      title: '亂鬥賽',
      advanceCount: 4,
      rows: this.tableRows(ids, games, this.rumbleNotes(progress)),
    };
  }

  private rumbleNotes(progress: MsiProgress): Map<string, string> {
    const notes = new Map<string, string>();
    for (const group of ['A', 'B', 'C'] as const) {
      const ranked = this.orderIds(MSI_2021_GROUPS[group], this.gamesIn(progress, group), 0).ids;
      for (let index = 0; index < 2; index += 1) {
        const id = this.resolveId(ranked[index] ?? '');
        const side = this.side(id);
        if (!id || !side) {
          continue;
        }
        notes.set(id, `${group}${index + 1} · ${side.seed}`);
      }
    }
    return notes;
  }

  private tableRows(ids: string[], games: Record<string, MsiGame>, notes?: Map<string, string>): MsiTableRow[] {
    return ids.map((id, index) => {
      const side = this.side(id);
      const wins = this.winCount(id, games);
      const losses = this.lossCount(id, games);
      const played = wins + losses;
      return {
        rank: index + 1,
        abbreviation: side?.abbreviation ?? id,
        name: side?.name ?? '',
        logoUrl: side?.logoUrl ?? null,
        wins,
        losses,
        winRate: played === 0 ? null : wins / played,
        note: notes?.get(id) || side?.seed || '',
      };
    });
  }

  private toView(fixture: MsiFixture, progress: MsiProgress): MsiMatchView {
    const game = progress.games[fixture.id];
    const games = this.gamesIn(progress, fixture.bucket);
    const table = this.tableRows(this.orderIds(fixture.tableIds, games, 0).ids, games);
    return {
      id: fixture.id,
      date: fixture.date,
      kickoff: MSI_KICKOFF,
      stage: fixture.stage,
      label: fixture.label,
      bestOf: fixture.bestOf,
      left: this.side(fixture.leftId),
      right: this.side(fixture.rightId),
      leftGames: game?.left ?? 0,
      rightGames: game?.right ?? 0,
      done: Boolean(game?.winnerId),
      tableTitle: fixture.tableTitle,
      table: fixture.tableIds.length > 0 ? table : [],
      bucket: fixture.bucket,
    };
  }

  private side(id: string): MsiSide | null {
    const resolved = this.resolveId(id);
    if (!resolved) {
      return null;
    }
    const champ = this.champion();
    if (champ && resolved === champ.teamId) {
      return {
        id: champ.teamId,
        teamId: champ.teamId,
        abbreviation: champ.abbreviation,
        name: champ.name,
        logoUrl: champ.logoUrl,
        region: 'TCS',
        seed: 'TCS#1',
        roster: [],
      };
    }
    const guest = MSI_2021_GUESTS.find((team) => team.id === resolved);
    if (!guest) {
      return null;
    }
    return {
      id: guest.id,
      teamId: null,
      abbreviation: guest.abbreviation,
      name: guest.name,
      logoUrl: guest.logoUrl,
      region: guest.region,
      seed: `${guest.region}#1`,
      roster: guest.roster,
    };
  }

  private resolveId(id: string): string {
    if (id !== MSI_PCS_SLOT) {
      return id;
    }
    return this.champion()?.teamId ?? '';
  }

  private champion(): PlayoffSide | null {
    const final = this.playoff.bundle('TCS').series.find((match) => match.id === 'final');
    if (!final || final.status !== 'done') {
      return null;
    }
    if (final.left?.isWinner) {
      return final.left;
    }
    if (final.right?.isWinner) {
      return final.right;
    }
    return null;
  }

  private read(): MsiProgress {
    this.revision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return this.empty();
    }
    return this.storage.getItem<MsiProgress>(this.storageKey(universeId)) ?? this.empty();
  }

  private write(progress: MsiProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), progress);
    this.revision.update((value) => value + 1);
  }

  private empty(): MsiProgress {
    return { games: {}, semiPickId: '' };
  }

  private storageKey(universeId: string): string {
    return `eus.msi.${MSI_YEAR}.${universeId}`;
  }
}
