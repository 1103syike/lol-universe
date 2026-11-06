import { Injectable, computed, inject, signal } from '@angular/core';
import type { PlayoffScore, PlayoffSeriesView, PlayoffSide, PlayoffStandingRow } from '../models/playoff-board.model';
import type { Team } from '../models/team.model';
import { losingSide, seriesView, winningSide } from '../../shared/utils/series-match';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

type CupGroup = 'A' | 'B';

interface FormosaProgress {
  seedTeamIds: string[];
  picks: string[];
  rankOrder: Record<CupGroup, string[]>;
  groupTie: CupGroup | null;
  playoffPickId: string | null;
  scores: Record<string, PlayoffScore>;
}

export interface CupRow {
  teamId: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  group: CupGroup;
  seriesWins: number;
  gameDiff: number;
  rank: number;
}

const SNAKE: CupGroup[] = ['A', 'B', 'B', 'A', 'A', 'B', 'B', 'A'];
const PLAYOFF_LATER = ['po-sf1', 'po-sf2', 'po-final', 'po-lb1', 'po-lb2', 'po-gf'];

@Injectable({ providedIn: 'root' })
export class FormosaBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);

  readonly progress = computed(() => {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return this.emptyProgress();
    }
    return this.readProgress(universeId);
  });

  readonly standings = computed(() => this.seedRows());
  readonly draftPool = computed(() => this.poolRows());
  readonly nextGroup = computed(() => SNAKE[this.progress().picks.length] ?? null);
  readonly groupA = computed(() => this.ranked('A'));
  readonly groupB = computed(() => this.ranked('B'));
  readonly groupSeries = computed(() => this.buildGroupSeries());
  readonly playInSeries = computed(() => this.buildPlayIn());
  readonly playoffSeries = computed(() => this.buildPlayoff());
  readonly series = computed(() => [...this.groupSeries(), ...this.playInSeries(), ...this.playoffSeries()]);
  readonly playoffChoices = computed(() => this.qualifierChoices());
  readonly outcomes = computed(() => this.buildOutcomes());
  readonly needsGroupTie = computed(() => this.groupsReady() && this.groupTotalsTied() && !this.progress().groupTie);
  readonly winnerGroup = computed(() => this.resolveWinnerGroup());
  readonly canReorder = computed(() => this.progress().picks.length === 0 && Object.keys(this.progress().scores).length === 0);
  readonly hasEnoughTeams = computed(() => this.teams().length >= 10);

  moveSeed(teamId: string, direction: -1 | 1): void {
    if (!this.canReorder()) {
      return;
    }
    const seedIds = [...this.progress().seedTeamIds];
    const index = seedIds.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= seedIds.length) {
      return;
    }
    const swapped = seedIds[nextIndex];
    seedIds[nextIndex] = seedIds[index];
    seedIds[index] = swapped;
    this.writeProgress({ ...this.emptyProgress(), seedTeamIds: seedIds });
  }

  pick(teamId: string): void {
    const pool = this.draftPool();
    if (this.progress().picks.length >= 8 || !pool.some((row) => row.teamId === teamId)) {
      return;
    }
    this.writeProgress({
      ...this.progress(),
      picks: [...this.progress().picks, teamId],
      rankOrder: { A: [], B: [] },
      groupTie: null,
      playoffPickId: null,
      scores: {},
    });
  }

  chooseGroupWinner(group: CupGroup): void {
    if (!this.groupsReady() || !this.groupTotalsTied()) {
      return;
    }
    this.writeProgress({
      ...this.progress(),
      groupTie: group,
      playoffPickId: null,
      scores: this.keepGroupScores(this.progress().scores),
    });
  }

  swapRank(group: CupGroup, teamId: string, direction: -1 | 1): void {
    const rows = group === 'A' ? this.groupA() : this.groupB();
    const index = rows.findIndex((row) => row.teamId === teamId);
    const nextIndex = index + direction;
    const current = rows[index];
    const neighbor = rows[nextIndex];
    if (!current || !neighbor || current.seriesWins !== neighbor.seriesWins || current.gameDiff !== neighbor.gameDiff) {
      return;
    }
    const order = rows.map((row) => row.teamId);
    order[index] = neighbor.teamId;
    order[nextIndex] = current.teamId;
    this.writeProgress({
      ...this.progress(),
      rankOrder: { ...this.progress().rankOrder, [group]: order },
      playoffPickId: null,
      scores: this.keepGroupScores(this.progress().scores),
    });
  }

  pickQualifier(teamId: string): void {
    const choices = this.playoffChoices();
    if (!choices.some((side) => side.teamId === teamId)) {
      return;
    }
    const scores = { ...this.progress().scores };
    for (const id of ['po-g1', 'po-g2', ...PLAYOFF_LATER]) {
      delete scores[id];
    }
    this.writeProgress({ ...this.progress(), playoffPickId: teamId, scores });
  }

  setWinner(seriesId: string, teamId: string): void {
    const match = this.series().find((item) => item.id === seriesId);
    if (!match || match.status !== 'ready') {
      return;
    }
    if (match.left?.teamId !== teamId && match.right?.teamId !== teamId) {
      return;
    }
    const scores = { ...this.progress().scores, [seriesId]: { winnerTeamId: teamId, loserGames: 1 } };
    this.clearAfter(seriesId, scores);
    const playoffPickId = seriesId.startsWith('g-') || seriesId.startsWith('pi-') ? null : this.progress().playoffPickId;
    const groupTie = seriesId.startsWith('g-') ? null : this.progress().groupTie;
    this.writeProgress({ ...this.progress(), scores, playoffPickId, groupTie });
  }

  setLoserGames(seriesId: string, loserGames: number): void {
    const current = this.progress().scores[seriesId];
    if (!current) {
      return;
    }
    const games = Math.min(2, Math.max(0, Math.round(loserGames)));
    const scores = { ...this.progress().scores, [seriesId]: { ...current, loserGames: games } };
    this.clearAfter(seriesId, scores);
    const playoffPickId = seriesId.startsWith('g-') || seriesId.startsWith('pi-') ? null : this.progress().playoffPickId;
    const groupTie = seriesId.startsWith('g-') ? null : this.progress().groupTie;
    this.writeProgress({ ...this.progress(), scores, playoffPickId, groupTie });
  }

  reset(): void {
    this.writeProgress({ ...this.emptyProgress(), seedTeamIds: this.teams().map((team) => team.id) });
  }

  private buildGroupSeries(): PlayoffSeriesView[] {
    const groupA = this.members('A');
    const groupB = this.members('B');
    if (groupA.length < 5 || groupB.length < 5) {
      return [];
    }
    const scores = this.progress().scores;
    const matches: PlayoffSeriesView[] = [];
    groupA.forEach((left, leftIndex) => {
      groupB.forEach((right, rightIndex) => {
        matches.push(seriesView(scores, `g-a${leftIndex}-b${rightIndex}`, '小組交叉', this.side(left, leftIndex + 1), this.side(right, rightIndex + 1)));
      });
    });
    return matches;
  }

  private buildPlayIn(): PlayoffSeriesView[] {
    if (!this.groupsReady() || !this.resolveWinnerGroup()) {
      return [];
    }
    const seeds = this.playInSeeds();
    if (seeds.length < 6) {
      return [];
    }
    const scores = this.progress().scores;
    const first = seriesView(scores, 'pi-g1', 'Play-In 1', seeds[2], seeds[5]);
    const second = seriesView(scores, 'pi-g2', 'Play-In 2', seeds[3], seeds[4]);
    const third = seriesView(scores, 'pi-g3', 'Play-In 3', seeds[0], winningSide(first));
    const fourth = seriesView(scores, 'pi-g4', 'Play-In 4', seeds[1], winningSide(second));
    const final = seriesView(scores, 'pi-final', 'Play-In 決賽', losingSide(third), losingSide(fourth));
    return [first, second, third, fourth, final];
  }

  private buildPlayoff(): PlayoffSeriesView[] {
    const playIn = this.playInSeries();
    if (playIn.length < 5 || playIn.some((match) => match.status !== 'done')) {
      return [];
    }
    const qualifiers = this.qualifiers();
    const winnerGroup = this.resolveWinnerGroup();
    if (qualifiers.length < 3 || !winnerGroup) {
      return [];
    }
    const ranked = winnerGroup === 'A' ? this.groupA() : this.groupB();
    const top = ranked.slice(0, 3).map((row, index) => this.side(row, index + 1));
    const picked = qualifiers.find((side) => side.teamId === this.progress().playoffPickId) ?? null;
    const rest = qualifiers.filter((side) => side.teamId !== picked?.teamId);
    const scores = this.progress().scores;
    const gameOne = seriesView(scores, 'po-g1', '季後賽 1', picked ? top[2] : null, picked);
    const gameTwo = seriesView(scores, 'po-g2', '季後賽 2', rest.length === 2 ? rest[0] : null, rest.length === 2 ? rest[1] : null);
    const semiOne = seriesView(scores, 'po-sf1', '季後賽 3', top[0], winningSide(gameOne));
    const semiTwo = seriesView(scores, 'po-sf2', '季後賽 4', top[1], winningSide(gameTwo));
    const winnersFinal = seriesView(scores, 'po-final', '勝部決賽', winningSide(semiOne), winningSide(semiTwo));
    const losersOne = seriesView(scores, 'po-lb1', '敗部 1', losingSide(semiOne), losingSide(semiTwo));
    const losersTwo = seriesView(scores, 'po-lb2', '敗部決賽', winningSide(losersOne), losingSide(winnersFinal));
    const grand = seriesView(scores, 'po-gf', '總決賽', winningSide(winnersFinal), winningSide(losersTwo));
    return [gameOne, gameTwo, semiOne, semiTwo, winnersFinal, losersOne, losersTwo, grand];
  }

  private buildOutcomes(): string[] {
    const grand = winningSide(this.playoffSeries().find((match) => match.id === 'po-gf'));
    const finalist = losingSide(this.playoffSeries().find((match) => match.id === 'po-gf'));
    const lines: string[] = [];
    if (grand) {
      lines.push(`${grand.abbreviation} 取得 First Stand 名額`);
    }
    if (finalist) {
      lines.push(`${finalist.abbreviation} 是亞軍。2026 年起亞軍也有名額`);
    }
    return lines;
  }

  private playInSeeds(): PlayoffSide[] {
    const winner = this.resolveWinnerGroup();
    if (!winner) {
      return [];
    }
    const winnerRows = winner === 'A' ? this.groupA() : this.groupB();
    const loserRows = winner === 'A' ? this.groupB() : this.groupA();
    const field = [...loserRows.slice(0, 4), ...winnerRows.slice(3, 5)];
    return field
      .slice()
      .sort((left, right) => right.seriesWins - left.seriesWins || right.gameDiff - left.gameDiff || left.abbreviation.localeCompare(right.abbreviation))
      .map((row, index) => this.side(row, index + 1));
  }

  private qualifiers(): PlayoffSide[] {
    const third = winningSide(this.playInSeries().find((match) => match.id === 'pi-g3'));
    const fourth = winningSide(this.playInSeries().find((match) => match.id === 'pi-g4'));
    const last = winningSide(this.playInSeries().find((match) => match.id === 'pi-final'));
    return [third, fourth, last].filter((side): side is PlayoffSide => !!side);
  }

  private qualifierChoices(): PlayoffSide[] {
    if (this.progress().playoffPickId) {
      return [];
    }
    const playoff = this.playoffSeries();
    if (playoff.length === 0) {
      return [];
    }
    return this.qualifiers();
  }

  private ranked(group: CupGroup): CupRow[] {
    const members = this.members(group);
    const records = this.records(members);
    const order = this.progress().rankOrder[group];
    return records
      .slice()
      .sort((left, right) => {
        if (left.seriesWins !== right.seriesWins) {
          return right.seriesWins - left.seriesWins;
        }
        if (left.gameDiff !== right.gameDiff) {
          return right.gameDiff - left.gameDiff;
        }
        const leftIndex = order.indexOf(left.teamId);
        const rightIndex = order.indexOf(right.teamId);
        if (leftIndex >= 0 && rightIndex >= 0 && leftIndex !== rightIndex) {
          return leftIndex - rightIndex;
        }
        return left.abbreviation.localeCompare(right.abbreviation);
      })
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }

  private records(members: Team[]): CupRow[] {
    const totals = new Map<string, { wins: number; diff: number }>();
    for (const team of members) {
      totals.set(team.id, { wins: 0, diff: 0 });
    }
    for (const match of this.buildGroupSeries()) {
      const score = this.progress().scores[match.id];
      if (!score || !match.left || !match.right) {
        continue;
      }
      const winner = totals.get(score.winnerTeamId);
      const loserId = score.winnerTeamId === match.left.teamId ? match.right.teamId : match.left.teamId;
      const loser = totals.get(loserId);
      if (!winner || !loser) {
        continue;
      }
      const margin = 3 - score.loserGames;
      winner.wins += 1;
      winner.diff += margin;
      loser.diff -= margin;
    }
    return members.map((team) => {
      const total = totals.get(team.id) ?? { wins: 0, diff: 0 };
      return {
        teamId: team.id,
        abbreviation: team.abbreviation,
        name: team.name,
        logoUrl: team.logoUrl,
        group: this.groupOf(team.id),
        seriesWins: total.wins,
        gameDiff: total.diff,
        rank: 0,
      };
    });
  }

  private members(group: CupGroup): Team[] {
    const teams = this.orderedTeams();
    if (teams.length < 2) {
      return [];
    }
    const captains = group === 'A' ? [teams[0]] : [teams[1]];
    const picked = this.progress().picks
      .map((teamId, index) => ({ teamId, group: SNAKE[index] }))
      .filter((pick) => pick.group === group)
      .map((pick) => teams.find((team) => team.id === pick.teamId))
      .filter((team): team is Team => !!team);
    return [...captains, ...picked];
  }

  private groupsReady(): boolean {
    return this.groupSeries().length === 25 && this.groupSeries().every((match) => match.status === 'done');
  }

  private groupTotalsTied(): boolean {
    const total = (rows: CupRow[]) => rows.reduce((sum, row) => sum + row.seriesWins, 0);
    const diff = (rows: CupRow[]) => rows.reduce((sum, row) => sum + row.gameDiff, 0);
    return total(this.groupA()) === total(this.groupB()) && diff(this.groupA()) === diff(this.groupB());
  }

  private resolveWinnerGroup(): CupGroup | null {
    if (!this.groupsReady()) {
      return null;
    }
    if (this.groupTotalsTied()) {
      return this.progress().groupTie;
    }
    const wins = (rows: CupRow[]) => rows.reduce((sum, row) => sum + row.seriesWins, 0);
    const diff = (rows: CupRow[]) => rows.reduce((sum, row) => sum + row.gameDiff, 0);
    if (wins(this.groupA()) !== wins(this.groupB())) {
      return wins(this.groupA()) > wins(this.groupB()) ? 'A' : 'B';
    }
    return diff(this.groupA()) > diff(this.groupB()) ? 'A' : 'B';
  }

  private clearAfter(seriesId: string, scores: Record<string, PlayoffScore>): void {
    const later = this.laterIds(seriesId);
    for (const id of Object.keys(scores)) {
      if (later.some((prefix) => id === prefix || id.startsWith(prefix))) {
        delete scores[id];
      }
    }
  }

  private laterIds(seriesId: string): string[] {
    if (seriesId.startsWith('g-')) {
      return ['pi-', 'po-'];
    }
    if (seriesId === 'pi-g1') {
      return ['pi-g3', 'pi-final', 'po-'];
    }
    if (seriesId === 'pi-g2') {
      return ['pi-g4', 'pi-final', 'po-'];
    }
    if (seriesId === 'pi-g3' || seriesId === 'pi-g4') {
      return ['pi-final', 'po-'];
    }
    if (seriesId === 'pi-final') {
      return ['po-'];
    }
    if (seriesId === 'po-g1') {
      return ['po-sf1', 'po-final', 'po-lb1', 'po-lb2', 'po-gf'];
    }
    if (seriesId === 'po-g2') {
      return ['po-sf2', 'po-final', 'po-lb1', 'po-lb2', 'po-gf'];
    }
    if (seriesId === 'po-sf1' || seriesId === 'po-sf2') {
      return ['po-final', 'po-lb1', 'po-lb2', 'po-gf'];
    }
    if (seriesId === 'po-final' || seriesId === 'po-lb1') {
      return ['po-lb2', 'po-gf'];
    }
    if (seriesId === 'po-lb2') {
      return ['po-gf'];
    }
    return [];
  }

  private keepGroupScores(scores: Record<string, PlayoffScore>): Record<string, PlayoffScore> {
    const kept: Record<string, PlayoffScore> = {};
    for (const [id, score] of Object.entries(scores)) {
      if (id.startsWith('g-')) {
        kept[id] = score;
      }
    }
    return kept;
  }

  private poolRows(): PlayoffStandingRow[] {
    const picked = new Set(this.progress().picks);
    return this.orderedTeams()
      .slice(2)
      .filter((team) => !picked.has(team.id))
      .map((team, index) => ({
        rank: index + 3,
        teamId: team.id,
        abbreviation: team.abbreviation,
        name: team.name,
        logoUrl: team.logoUrl,
        inPlayoff: true,
      }));
  }

  private seedRows(): PlayoffStandingRow[] {
    return this.orderedTeams().map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      logoUrl: team.logoUrl,
      inPlayoff: true,
    }));
  }

  private orderedTeams(): Team[] {
    const ids = this.progress().seedTeamIds;
    const teams = this.teams();
    const ordered = ids
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter((team): team is Team => !!team);
    const rest = teams.filter((team) => !ids.includes(team.id));
    return [...ordered, ...rest];
  }

  private groupOf(teamId: string): CupGroup {
    const teams = this.orderedTeams();
    if (teams[0]?.id === teamId) {
      return 'A';
    }
    const pickIndex = this.progress().picks.indexOf(teamId);
    return SNAKE[pickIndex] ?? 'B';
  }

  private side(team: { id?: string; teamId?: string; abbreviation: string; name: string; logoUrl: string | null }, seed: number): PlayoffSide {
    return {
      teamId: team.teamId ?? team.id ?? '',
      seed,
      abbreviation: team.abbreviation,
      name: team.name,
      logoUrl: team.logoUrl,
      games: null,
      isWinner: false,
    };
  }

  private teams(): Team[] {
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === 'TCS')
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(): FormosaProgress {
    return {
      seedTeamIds: [],
      picks: [],
      rankOrder: { A: [], B: [] },
      groupTie: null,
      playoffPickId: null,
      scores: {},
    };
  }

  private readProgress(universeId: string): FormosaProgress {
    const stored = this.storage.getItem<FormosaProgress>(`eus.formosa.${universeId}`);
    const known = new Set(this.teams().map((team) => team.id));
    const kept = (stored?.seedTeamIds ?? []).filter((teamId) => known.has(teamId));
    const missing = this.teams()
      .map((team) => team.id)
      .filter((teamId) => !kept.includes(teamId));
    return {
      seedTeamIds: [...kept, ...missing],
      picks: (stored?.picks ?? []).filter((teamId) => known.has(teamId)),
      rankOrder: {
        A: (stored?.rankOrder?.A ?? []).filter((teamId) => known.has(teamId)),
        B: (stored?.rankOrder?.B ?? []).filter((teamId) => known.has(teamId)),
      },
      groupTie: stored?.groupTie ?? null,
      playoffPickId: stored?.playoffPickId ?? null,
      scores: stored?.scores ?? {},
    };
  }

  private writeProgress(progress: FormosaProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(`eus.formosa.${universeId}`, progress);
    this.progressRevision.update((value) => value + 1);
  }
}
