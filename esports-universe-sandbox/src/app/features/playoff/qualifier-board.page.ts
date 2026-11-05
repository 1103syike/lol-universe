import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { QualifierFormatId } from '../../core/services/qualifier-board.service';
import { QualifierBoardService } from '../../core/services/qualifier-board.service';
import { UniverseService } from '../../core/services/universe.service';
import { SeriesCardComponent } from '../../shared/ui/series-card/series-card.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';

const FORMAT_COPY: Record<QualifierFormatId, { eyebrow: string; heading: string; lead: string }> = {
  'worlds-2021': {
    eyebrow: '2021–2022',
    heading: '世界賽第三種子',
    lead: '年度積分第 4 名先打第 5 名，勝者再打第 3 名。勝者是第三種子。全部 BO5。名次現在用手動排序代替積分表。',
  },
  'worlds-2023': {
    eyebrow: '2023 起',
    heading: '世界賽第三、第四種子',
    lead: '第 3、4 名打勝者組，冠軍是第三種子。第 5、6 名先打敗者組，勝者再打勝者組的敗者，冠軍是第四種子。沒有總冠軍戰。第一、第二種子的產生方式還沒確認，這張不處理。',
  },
  'promotion-2023': {
    eyebrow: '2023–2024',
    heading: '升降賽',
    lead: 'TCL 第 1 名從 TCS 第 9、10 名挑一個。TCL 第 2 名打剩下的。兩場都是 BO5。勝者拿下一階段 TCS，敗者留在 TCL。春夏是各自一張，這裡先跑一季的對陣。',
  },
};

@Component({
  selector: 'app-qualifier-board-page',
  imports: [RouterLink, SeriesCardComponent, TeamLogoComponent],
  templateUrl: './qualifier-board.page.html',
  styleUrl: './playoff-board.page.scss',
})
export class QualifierBoardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly board = inject(QualifierBoardService);
  private readonly universeService = inject(UniverseService);

  readonly formatId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('formatId') ?? 'worlds-2021')),
    { initialValue: 'worlds-2021' },
  );
  readonly activeUniverse = this.universeService.activeUniverse;
  readonly tcsStandings = this.board.tcsStandings;
  readonly tclStandings = this.board.tclStandings;
  readonly series = this.board.series;
  readonly schedule = this.board.schedule;
  readonly progress = this.board.progress;
  readonly outcomes = this.board.outcomes;
  readonly hasEnoughTeams = this.board.hasEnoughTeams;
  readonly canReorder = this.board.canReorder;
  readonly copy = computed(() => {
    const formatId = this.formatId();
    if (formatId === 'worlds-2021' || formatId === 'worlds-2023' || formatId === 'promotion-2023') {
      return FORMAT_COPY[formatId];
    }
    return FORMAT_COPY['worlds-2021'];
  });
  readonly promotionChoices = computed(() => this.tcsStandings().slice(8, 10));

  constructor() {
    effect(() => {
      const formatId = this.formatId();
      if (formatId === 'worlds-2021' || formatId === 'worlds-2023' || formatId === 'promotion-2023') {
        this.board.setFormat(formatId);
      }
    });
  }

  moveSeed(league: 'TCS' | 'TCL', teamId: string, direction: -1 | 1): void {
    this.board.moveSeed(league, teamId, direction);
  }

  pickPromotionOpponent(teamId: string): void {
    this.board.pickPromotionOpponent(teamId);
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
