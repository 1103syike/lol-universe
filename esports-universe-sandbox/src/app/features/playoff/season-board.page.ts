import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { LeagueTier } from '../../core/models/league.model';
import { SeasonBoardService, type SeasonBoardId } from '../../core/services/season-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { SeriesCardComponent } from '../../shared/ui/series-card/series-card.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

const COPY: Record<SeasonBoardId, { eyebrow: string; heading: string; lead: string; empty: string }> = {
  retention: {
    eyebrow: '2025 夏後',
    heading: 'TCS 保留賽',
    lead: '把 Rise 第 3 到第 6 名排進 TCS 第 7 到第 10，TCL 前兩名排在 TCL 表最上面。第 1、2 種子輪空。第一輪是第 3 對第 6、第 4 對第 5。冠軍和亞軍都進下一年 TCS。',
    empty: '需要 10 支 TCS 和至少 2 支 TCL。',
  },
  ea: {
    eyebrow: '2023 起',
    heading: '學院聯賽季後賽',
    lead: '夏季前 6 名，比照六隊雙敗。第一輪輸了還留在敗部。第 2 名那條線的敗者先打第一輪敗部勝者，再打第 1 名那條線的敗者。總決賽一場 BO5。',
    empty: '需要至少 6 支 EA。到隊伍頁把聯賽改成 EA 之後，這張表才排得起來。',
  },
  rl: {
    eyebrow: '2023 起',
    heading: '二隊聯賽季後賽',
    lead: '前 12 名單敗淘汰。第 1 到第 4 名輪空到八強。八強把第 1 名和第 2 名分到不同半區，兩人只會在決賽碰上。',
    empty: '需要至少 12 支 RL。到隊伍頁把聯賽改成 RL 之後，這張表才排得起來。',
  },
};

@Component({
  selector: 'app-season-board-page',
  imports: [RouterLink, SeriesCardComponent, TeamLogoComponent],
  templateUrl: './season-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class SeasonBoardPage {
  private readonly board = inject(SeasonBoardService);
  private readonly universeService = inject(UniverseService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly boardId = this.board.boardId;
  readonly tcsStandings = this.board.tcsStandings;
  readonly tclStandings = this.board.tclStandings;
  readonly academyStandings = this.board.academyStandings;
  readonly reserveStandings = this.board.reserveStandings;
  readonly series = this.board.series;
  readonly schedule = this.board.schedule;
  readonly outcomes = this.board.outcomes;
  readonly canReorder = this.board.canReorder;
  readonly hasEnoughTeams = this.board.hasEnoughTeams;

  constructor() {
    inject(ActivatedRoute)
      .data.pipe(takeUntilDestroyed())
      .subscribe((data) => {
        const boardId = this.readBoard(data['board']);
        this.board.setBoard(boardId);
      });
  }

  moveSeed(tier: LeagueTier, teamId: string, direction: -1 | 1): void {
    this.board.moveSeed(tier, teamId, direction);
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

  pageCopy(): (typeof COPY)[SeasonBoardId] {
    return COPY[this.boardId()];
  }

  private readBoard(board: unknown): SeasonBoardId {
    if (board === 'ea' || board === 'rl' || board === 'retention') {
      return board;
    }
    return 'retention';
  }
}
