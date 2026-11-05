import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLAYOFF_SERIES_IDS } from '../../core/models/playoff-board.model';
import { PlayoffBoardService } from '../../core/services/playoff-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

@Component({
  selector: 'app-playoff-board-page',
  imports: [RouterLink, TeamLogoComponent],
  templateUrl: './playoff-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class PlayoffBoardPage {
  private readonly playoffBoardService = inject(PlayoffBoardService);
  private readonly universeService = inject(UniverseService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly standings = this.playoffBoardService.standings;
  readonly seeds = this.playoffBoardService.seeds;
  readonly series = this.playoffBoardService.series;
  readonly schedule = this.playoffBoardService.schedule;
  readonly progress = this.playoffBoardService.progress;

  readonly roundOneChoices = computed(() => this.seeds().slice(4, 6));
  readonly semiChoices = computed(() => {
    const winners = [PLAYOFF_SERIES_IDS.roundOneHigh, PLAYOFF_SERIES_IDS.roundOneLow]
      .map((seriesId) => this.series().find((series) => series.id === seriesId))
      .map((series) => (series?.left?.isWinner ? series.left : series?.right?.isWinner ? series.right : null))
      .filter((side) => !!side);
    return winners;
  });
  readonly canReorderSeeds = computed(
    () => !this.progress().roundOneOpponentId && Object.keys(this.progress().scores).length === 0,
  );

  moveSeed(teamId: string, direction: -1 | 1): void {
    this.playoffBoardService.moveSeed(teamId, direction);
  }

  pickRoundOneOpponent(teamId: string): void {
    this.playoffBoardService.pickRoundOneOpponent(teamId);
  }

  pickSemiOpponent(teamId: string): void {
    this.playoffBoardService.pickSemiOpponent(teamId);
  }

  setWinner(seriesId: string, teamId: string): void {
    this.playoffBoardService.setWinner(seriesId, teamId);
  }

  setLoserGames(seriesId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.playoffBoardService.setLoserGames(seriesId, Number(input.value));
  }

  reset(): void {
    this.playoffBoardService.reset();
  }
}
