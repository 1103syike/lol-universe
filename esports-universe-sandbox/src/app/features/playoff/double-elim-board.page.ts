import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DoubleElimBoardService } from '../../core/services/double-elim-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { SeriesCardComponent } from '../../shared/ui/series-card/series-card.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

@Component({
  selector: 'app-double-elim-board-page',
  imports: [RouterLink, SeriesCardComponent, TeamLogoComponent],
  templateUrl: './double-elim-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class DoubleElimBoardPage {
  private readonly board = inject(DoubleElimBoardService);
  private readonly universeService = inject(UniverseService);
  private readonly route = inject(ActivatedRoute);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly league = this.board.activeLeague;

  constructor() {
    const league = this.route.snapshot.data['league'] === 'TCL' ? 'TCL' : 'TCS';
    this.board.setLeague(league);
  }
  readonly standings = this.board.standings;
  readonly seeds = this.board.seeds;
  readonly series = this.board.series;
  readonly schedule = this.board.schedule;
  readonly progress = this.board.progress;
  readonly champion = this.board.champion;

  readonly roundOneChoices = computed(() => this.seeds().slice(4, 6));
  readonly roundTwoChoices = computed(() => {
    const winners = this.series()
      .filter((series) => series.id === 'r1-high' || series.id === 'r1-low')
      .map((series) => (series.left?.isWinner ? series.left : series.right?.isWinner ? series.right : null))
      .filter((side) => !!side);
    return winners.length === 2 ? winners : [];
  });
  readonly canReorderSeeds = computed(
    () => !this.progress().roundOneOpponentId && Object.keys(this.progress().scores).length === 0,
  );
  readonly openingRound = computed(() => this.series().slice(0, 2));
  readonly secondRound = computed(() => this.series().slice(2, 4));
  readonly middleRound = computed(() => this.series().slice(4, 6));
  readonly losersFinal = computed(() => this.series().find((series) => series.id === 'losers-final') ?? null);
  readonly grandFinal = computed(() => this.series().find((series) => series.id === 'grand-final') ?? null);

  moveSeed(teamId: string, direction: -1 | 1): void {
    this.board.moveSeed(teamId, direction);
  }

  pickRoundOneOpponent(teamId: string): void {
    this.board.pickRoundOneOpponent(teamId);
  }

  pickRoundTwoOpponent(teamId: string): void {
    this.board.pickRoundTwoOpponent(teamId);
  }

  setWinner(seriesId: string, teamId: string): void {
    this.board.setWinner(seriesId, teamId);
  }

  setLoserGames(seriesId: string, games: number): void {
    this.board.setLoserGames(seriesId, games);
  }

  reset(): void {
    this.board.reset();
  }
}
