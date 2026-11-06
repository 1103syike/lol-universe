import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormosaBoardService } from '../../core/services/formosa-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { SeriesCardComponent } from '../../shared/ui/series-card/series-card.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

@Component({
  selector: 'app-formosa-board-page',
  imports: [RouterLink, SeriesCardComponent, TeamLogoComponent],
  templateUrl: './formosa-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class FormosaBoardPage {
  private readonly board = inject(FormosaBoardService);
  private readonly universeService = inject(UniverseService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly standings = this.board.standings;
  readonly draftPool = this.board.draftPool;
  readonly nextGroup = this.board.nextGroup;
  readonly groupA = this.board.groupA;
  readonly groupB = this.board.groupB;
  readonly groupSeries = this.board.groupSeries;
  readonly playInSeries = this.board.playInSeries;
  readonly playoffSeries = this.board.playoffSeries;
  readonly playoffChoices = this.board.playoffChoices;
  readonly outcomes = this.board.outcomes;
  readonly needsGroupTie = this.board.needsGroupTie;
  readonly winnerGroup = this.board.winnerGroup;
  readonly canReorder = this.board.canReorder;
  readonly hasEnoughTeams = this.board.hasEnoughTeams;

  moveSeed(teamId: string, direction: -1 | 1): void {
    this.board.moveSeed(teamId, direction);
  }

  pick(teamId: string): void {
    this.board.pick(teamId);
  }

  chooseGroupWinner(group: 'A' | 'B'): void {
    this.board.chooseGroupWinner(group);
  }

  swapRank(group: 'A' | 'B', teamId: string, direction: -1 | 1): void {
    this.board.swapRank(group, teamId, direction);
  }

  pickQualifier(teamId: string): void {
    this.board.pickQualifier(teamId);
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

  groupWins(rows: { seriesWins: number }[]): number {
    return rows.reduce((sum, row) => sum + row.seriesWins, 0);
  }
}
