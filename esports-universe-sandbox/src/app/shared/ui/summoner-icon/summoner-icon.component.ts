import { NgStyle } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { getSummonerSpell, summonerSpriteStyle } from '../../../core/models/summoner-spell.model';

@Component({
  selector: 'app-summoner-icon',
  imports: [NgStyle],
  templateUrl: './summoner-icon.component.html',
  styleUrl: './summoner-icon.component.scss',
})
export class SummonerIconComponent {
  readonly spellId = input.required<string>();
  readonly size = input(18);
  readonly ready = input(true);

  readonly spell = computed(() => getSummonerSpell(this.spellId()));

  readonly label = computed(() => {
    const spell = this.spell();
    return spell ? `${spell.nameZh} · ${spell.name}` : this.spellId();
  });

  readonly spriteStyle = computed(() => summonerSpriteStyle(this.spellId(), this.size()));
}
