import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HillBoardService } from '../../core/services/hill-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { SeriesCardComponent } from '../../shared/ui/series-card/series-card.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

@Component({
  selector: 'app-hill-board-page',
  imports: [RouterLink, SeriesCardComponent, TeamLogoComponent],
  templateUrl: './hill-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class HillBoardPage {
  private readonly board = inject(HillBoardService);
  private readonly universeService = inject(UniverseService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly standings = this.board.standings;
  readonly seeds = this.board.seeds;
  readonly series = this.board.series;
  readonly schedule = this.board.schedule;
  readonly progress = this.board.progress;
  readonly champion = this.board.champion;
  readonly canReorderSeeds = computed(() => Object.keys(this.progress().scores).length === 0);
  readonly openingRound = computed(() => this.series().slice(0, 2));
  readonly secondRound = computed(() => this.series().slice(2, 4));
  readonly thirdRound = computed(() => this.series().slice(4, 6));
  readonly middleRound = computed(() => this.series().slice(6, 8));
  readonly losersFinal = computed(() => this.series().find((series) => series.id === 'losers-final') ?? null);
  readonly grandFinal = computed(() => this.series().find((series) => series.id === 'grand-final') ?? null);

  groupLabel(rank: number): string {
    if (rank <= 6) {
      return 'Legend';
    }
    if (rank <= 8) {
      return 'Rise';
    }
    return '—';
  }

  moveSeed(teamId: string, direction: -1 | 1): void {
    this.board.moveSeed(teamId, direction);
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
