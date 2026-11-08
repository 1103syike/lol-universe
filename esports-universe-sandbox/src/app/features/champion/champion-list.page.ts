import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  CHAMPION_DATA_VERSION,
  CHAMPION_ROLE_LABELS,
  CHAMPION_TAG_LABELS,
  listChampions,
  type ChampionRole,
  type ChampionTag,
} from '../../core/models/champion.model';
import { ChampionIconComponent } from '../../shared/ui/champion-icon/champion-icon.component';
import { bindPageScene } from '../../shared/utils/bind-page-scene';

@Component({
  selector: 'app-champion-list-page',
  imports: [ChampionIconComponent],
  templateUrl: './champion-list.page.html',
  styleUrl: './champion-list.page.scss',
})
export class ChampionListPage {
  constructor() {
    bindPageScene(inject(DestroyRef), 'champions', '英雄');
  }

  readonly dataVersion = CHAMPION_DATA_VERSION;
  readonly tagLabels = CHAMPION_TAG_LABELS;
  readonly roleLabels = CHAMPION_ROLE_LABELS;
  readonly query = signal('');
  readonly selectedTag = signal<ChampionTag | 'ALL'>('ALL');

  readonly tagFilters: Array<ChampionTag | 'ALL'> = [
    'ALL',
    'Fighter',
    'Tank',
    'Mage',
    'Assassin',
    'Marksman',
    'Support',
  ];

  readonly champions = computed(() => {
    const q = this.query().trim().toLowerCase();
    const tag = this.selectedTag();
    return listChampions().filter((champion) => {
      if (tag !== 'ALL' && !champion.tags.includes(tag)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        champion.name.toLowerCase().includes(q) ||
        champion.nameZh.includes(q) ||
        champion.id.toLowerCase().includes(q) ||
        champion.title.toLowerCase().includes(q) ||
        champion.titleZh.includes(q)
      );
    });
  });

  readonly totalCount = listChampions().length;

  setTag(tag: ChampionTag | 'ALL'): void {
    this.selectedTag.set(tag);
  }

  onQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
  }

  roleText(roles: ChampionRole[]): string {
    return roles.map((role) => this.roleLabels[role] ?? role).join(' · ');
  }
}
