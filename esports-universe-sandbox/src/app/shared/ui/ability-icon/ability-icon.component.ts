import { NgStyle } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { abilityIconUrl } from '../../../core/data/ability-icons';

@Component({
  selector: 'app-ability-icon',
  imports: [NgStyle],
  templateUrl: './ability-icon.component.html',
  styleUrl: './ability-icon.component.scss',
})
export class AbilityIconComponent {
  readonly championId = input.required<string>();
  readonly slot = input.required<string>();
  readonly size = input(24);
  readonly ready = input(true);
  readonly locked = input(false);

  readonly iconUrl = computed(() => abilityIconUrl(this.championId(), this.slot()));

  readonly label = computed(() => `${this.championId()} ${this.slot()}`);

  readonly hostStyle = computed(() => ({
    width: `${this.size()}px`,
    height: `${this.size()}px`,
    backgroundImage: this.iconUrl() ? `url(${this.iconUrl()})` : 'none',
  }));
}
