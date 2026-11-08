import { Component, computed, input } from '@angular/core';
import {
  championTileUrl,
  getChampionById,
  type ChampionDefinition,
} from '../../../core/models/champion.model';

@Component({
  selector: 'app-champion-icon',
  templateUrl: './champion-icon.component.html',
  styleUrl: './champion-icon.component.scss',
})
export class ChampionIconComponent {
  readonly championId = input.required<string>();
  readonly size = input(32);
  readonly bare = input(false);

  readonly champion = computed<ChampionDefinition | null>(() => getChampionById(this.championId()));

  readonly src = computed(() => {
    const champion = this.champion();
    return champion ? championTileUrl(champion.id) : '';
  });

  readonly label = computed(() => {
    const champion = this.champion();
    return champion ? `${champion.nameZh} · ${champion.name}` : this.championId();
  });
}
