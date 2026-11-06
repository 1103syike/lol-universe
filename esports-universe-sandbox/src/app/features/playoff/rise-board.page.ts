import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RiseBoardService, type RiseBoardId } from '../../core/services/rise-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { SeriesCardComponent } from '../../shared/ui/series-card/series-card.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

const COPY: Record<RiseBoardId, { eyebrow: string; heading: string; lead: string }> = {
  rise: {
    eyebrow: '2025 夏前',
    heading: 'Rise 組資格賽',
    lead: '把春季例行賽的 TCS 第 7 到第 10 名排在 TCS 表，TCL 前 4 名排在 TCL 表。TCL 依序選 TCS 對手。四場勝者直接進 Rise。敗隊先比該場勝局，再比原種子。敗隊第 1 名選第 3 或第 4 名。',
  },
  'rise-2026': {
    eyebrow: '2026 夏前',
    heading: 'Rise 組資格賽',
    lead: '跟 2025 同一張表。春季 TCS 第 7 到第 10 名加 TCL 前 4 名。敗隊排序也一樣。',
  },
  slot: {
    eyebrow: '2026 夏後',
    heading: '下一年度 TCS 資格賽',
    lead: '把 Rise 第 3 到第 6 名排進 TCS 第 7 到第 10，TCL 夏季前 4 名排在 TCL 表。TCL 依序選對手。四名勝者再依原種子排，第 1 對第 4、第 2 對第 3。兩場勝者進下一年 TCS。',
  },
};

@Component({
  selector: 'app-rise-board-page',
  imports: [RouterLink, SeriesCardComponent, TeamLogoComponent],
  templateUrl: './rise-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class RiseBoardPage {
  private readonly board = inject(RiseBoardService);
  private readonly universeService = inject(UniverseService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly boardId = this.board.boardId;
  readonly tcsStandings = this.board.tcsStandings;
  readonly tclStandings = this.board.tclStandings;
  readonly series = this.board.series;
  readonly schedule = this.board.schedule;
  readonly outcomes = this.board.outcomes;
  readonly pickChoices = this.board.pickChoices;
  readonly stageChoices = this.board.stageChoices;
  readonly nextPicker = this.board.nextPicker;
  readonly canReorder = this.board.canReorder;
  readonly hasEnoughTeams = this.board.hasEnoughTeams;

  constructor() {
    inject(ActivatedRoute)
      .data.pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.board.setBoard(this.readBoard(data['board']));
      });
  }

  moveSeed(league: 'TCS' | 'TCL', teamId: string, direction: -1 | 1): void {
    this.board.moveSeed(league, teamId, direction);
  }

  pickOpponent(teamId: string): void {
    this.board.pickOpponent(teamId);
  }

  pickStageOpponent(teamId: string): void {
    this.board.pickStageOpponent(teamId);
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

  pageCopy(): (typeof COPY)[RiseBoardId] {
    return COPY[this.boardId()];
  }

  tcsLabel(rank: number): string {
    if (rank < 7 || rank > 10) {
      return '—';
    }
    if (this.boardId() === 'slot') {
      return `Rise ${rank - 4}`;
    }
    return `TCS ${rank}`;
  }

  private readBoard(board: unknown): RiseBoardId {
    if (board === 'rise' || board === 'rise-2026' || board === 'slot') {
      return board;
    }
    return 'rise';
  }
}
