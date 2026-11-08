import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  STATS_COMPETITION_LABELS,
  type ChampionStatsRow,
  type PlayerStatsRow,
  type StatsCompetition,
  type StatsPeriodId,
  type StatsViewMode,
} from '../../core/models/competition-stats.model';
import {
  PLAYER_POSITIONS,
  PLAYER_POSITION_LABELS,
  type PlayerPosition,
} from '../../core/models/player.model';
import { CompetitionStatsService } from '../../core/services/competition-stats.service';
import { SeasonClockService } from '../../core/services/season-clock.service';
import { UniverseService } from '../../core/services/universe.service';
import { ChampionIconComponent } from '../../shared/ui/champion-icon/champion-icon.component';
import { MenuComponent } from '../../shared/ui/menu/menu.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { bindPageScene } from '../../shared/utils/bind-page-scene';

type PositionFilter = PlayerPosition | 'ALL';
type SortDir = 'asc' | 'desc';
type PlayerSortKey =
  | 'gamertag'
  | 'abbreviation'
  | 'position'
  | 'games'
  | 'wins'
  | 'winRate'
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'kda'
  | 'kpPct'
  | 'csm'
  | 'dpm'
  | 'gpm'
  | 'vspm';
type ChampSortKey =
  | 'championNameZh'
  | 'picks'
  | 'bans'
  | 'presence'
  | 'winRate'
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'kda'
  | 'csm'
  | 'dpm'
  | 'gpm';

@Component({
  selector: 'app-stats-database-page',
  imports: [
    DecimalPipe,
    RouterLink,
    ChampionIconComponent,
    MenuComponent,
    RoleIconComponent,
    TeamLogoComponent,
  ],
  templateUrl: './stats-database.page.html',
  styleUrl: './stats-database.page.scss',
})
export class StatsDatabasePage {
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly stats = inject(CompetitionStatsService);

  constructor() {
    bindPageScene(inject(DestroyRef), 'stats', '數據庫');
  }

  readonly competitionLabels = STATS_COMPETITION_LABELS;
  readonly positionLabels = PLAYER_POSITION_LABELS;
  readonly positions = PLAYER_POSITIONS;

  readonly periodId = signal<StatsPeriodId>(this.stats.currentPeriodId());
  readonly competition = signal<StatsCompetition>('TCS');
  readonly mode = signal<StatsViewMode>('players');
  readonly positionFilter = signal<PositionFilter>('ALL');
  readonly playerSortKey = signal<PlayerSortKey>('games');
  readonly champSortKey = signal<ChampSortKey>('presence');
  readonly sortDir = signal<SortDir>('desc');

  readonly activeUniverse = this.universeService.activeUniverse;

  readonly periodOptions = computed(() => this.stats.periodOptions());
  readonly periodMenu = computed(() =>
    this.periodOptions().map((item) => ({ value: item.id, label: item.label })),
  );
  readonly periodLabel = computed(
    () => this.periodOptions().find((item) => item.id === this.periodId())?.label ?? '全生涯',
  );
  readonly competitions = computed(() => this.stats.competitionsForPeriod(this.periodId()));
  readonly gamesPlayed = computed(() => this.stats.gamesPlayed(this.competition(), this.periodId()));

  readonly playerRows = computed(() => {
    const position = this.positionFilter();
    const key = this.playerSortKey();
    const dir = this.sortDir();
    const rows = this.stats
      .playersFor(this.competition(), this.periodId())
      .filter((row) => position === 'ALL' || row.position === position)
      .slice()
      .sort((left, right) => this.comparePlayer(left, right, key, dir));
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  });

  readonly championRows = computed(() => {
    const key = this.champSortKey();
    const dir = this.sortDir();
    const rows = this.stats
      .championsFor(this.competition(), this.periodId())
      .slice()
      .sort((left, right) => this.compareChamp(left, right, key, dir));
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  });

  setPeriod(value: string | number): void {
    const id = String(value) as StatsPeriodId;
    this.periodId.set(id);
    const allowed = this.stats.competitionsForPeriod(id);
    if (!allowed.includes(this.competition())) {
      this.competition.set(allowed[0] ?? 'TCS');
    }
  }

  setCompetition(value: StatsCompetition): void {
    this.competition.set(value);
  }

  setMode(value: StatsViewMode): void {
    this.mode.set(value);
    this.sortDir.set('desc');
    if (value === 'players') {
      this.playerSortKey.set('games');
    } else {
      this.champSortKey.set('presence');
      this.positionFilter.set('ALL');
    }
  }

  setPosition(value: PositionFilter): void {
    this.positionFilter.set(value);
  }

  sortPlayers(key: PlayerSortKey): void {
    if (this.playerSortKey() === key) {
      this.sortDir.update((dir) => (dir === 'desc' ? 'asc' : 'desc'));
      return;
    }
    this.playerSortKey.set(key);
    this.sortDir.set(key === 'gamertag' || key === 'abbreviation' || key === 'position' ? 'asc' : 'desc');
  }

  sortChamps(key: ChampSortKey): void {
    if (this.champSortKey() === key) {
      this.sortDir.update((dir) => (dir === 'desc' ? 'asc' : 'desc'));
      return;
    }
    this.champSortKey.set(key);
    this.sortDir.set(key === 'championNameZh' ? 'asc' : 'desc');
  }

  playerSortMark(key: PlayerSortKey): string {
    if (this.playerSortKey() !== key) {
      return '';
    }
    return this.sortDir() === 'desc' ? ' ↓' : ' ↑';
  }

  champSortMark(key: ChampSortKey): string {
    if (this.champSortKey() !== key) {
      return '';
    }
    return this.sortDir() === 'desc' ? ' ↓' : ' ↑';
  }

  private comparePlayer(
    left: PlayerStatsRow,
    right: PlayerStatsRow,
    key: PlayerSortKey,
    dir: SortDir,
  ): number {
    const factor = dir === 'asc' ? 1 : -1;
    if (key === 'gamertag' || key === 'abbreviation' || key === 'position') {
      return left[key].localeCompare(right[key]) * factor;
    }
    if (key === 'wins') {
      return (left.wins - right.wins || left.winRate - right.winRate) * factor;
    }
    return ((left[key] as number) - (right[key] as number)) * factor || left.gamertag.localeCompare(right.gamertag);
  }

  private compareChamp(
    left: ChampionStatsRow,
    right: ChampionStatsRow,
    key: ChampSortKey,
    dir: SortDir,
  ): number {
    const factor = dir === 'asc' ? 1 : -1;
    if (key === 'championNameZh') {
      return left.championNameZh.localeCompare(right.championNameZh) * factor;
    }
    return (
      ((left[key] as number) - (right[key] as number)) * factor ||
      left.championNameZh.localeCompare(right.championNameZh)
    );
  }
}
