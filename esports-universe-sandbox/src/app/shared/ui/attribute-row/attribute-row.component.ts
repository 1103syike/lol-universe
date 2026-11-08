import { Component, input } from '@angular/core';
import type { AttributeRating } from '../../../core/models/player.model';
import { growthRateToTrend, starsDisplay, trendSymbol } from '../../utils/player-potential';

@Component({
  selector: 'app-attribute-row',
  templateUrl: './attribute-row.component.html',
  styleUrl: './attribute-row.component.scss',
})
export class AttributeRowComponent {
  readonly label = input.required<string>();
  readonly rating = input.required<AttributeRating>();
  readonly showHidden = input(false);

  currentStars(): string {
    return starsDisplay(this.rating().current);
  }

  potentialStars(): string {
    return starsDisplay(this.rating().potential);
  }

  trend(): string {
    return trendSymbol(growthRateToTrend(this.rating().growthRate));
  }
}
