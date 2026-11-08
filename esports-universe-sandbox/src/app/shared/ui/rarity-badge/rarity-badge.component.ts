import { Component, computed, input } from '@angular/core';
import type { Rarity } from '../../../core/models/rarity.model';
import { RARITY_LABELS, RARITY_NAMES, isRarity } from '../../../core/models/rarity.model';

@Component({
  selector: 'app-rarity-badge',
  templateUrl: './rarity-badge.component.html',
  styleUrl: './rarity-badge.component.scss',
})
export class RarityBadgeComponent {
  readonly rarity = input<Rarity | string | null | undefined>('N');
  readonly labels = RARITY_LABELS;
  readonly names = RARITY_NAMES;

  readonly safeRarity = computed<Rarity>(() => {
    const value = String(this.rarity() ?? '');
    return isRarity(value) ? value : 'N';
  });
}
