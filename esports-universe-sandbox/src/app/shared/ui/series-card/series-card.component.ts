import { Component, input, output } from '@angular/core';
import type { PlayoffSeriesView } from '../../../core/models/playoff-board.model';
import { TeamLogoComponent } from '../team-logo/team-logo.component';

@Component({
  selector: 'app-series-card',
  imports: [TeamLogoComponent],
  templateUrl: './series-card.component.html',
  styleUrl: './series-card.component.scss',
})
export class SeriesCardComponent {
  readonly match = input.required<PlayoffSeriesView>();
  readonly pickWinner = output<{ seriesId: string; teamId: string }>();
  readonly loserGamesChange = output<{ seriesId: string; games: number }>();

  chooseSide(side: 'left' | 'right'): void {
    const match = this.match();
    const teamId = side === 'left' ? match.left?.teamId : match.right?.teamId;
    if (match.status !== 'ready' || !teamId) {
      return;
    }
    this.pickWinner.emit({ seriesId: match.id, teamId });
  }

  changeLoserGames(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.loserGamesChange.emit({ seriesId: this.match().id, games: Number(input.value) });
  }

  loserGames(): number | null {
    const match = this.match();
    if (match.left?.isWinner) {
      return match.right?.games ?? null;
    }
    if (match.right?.isWinner) {
      return match.left?.games ?? null;
    }
    return null;
  }
}
