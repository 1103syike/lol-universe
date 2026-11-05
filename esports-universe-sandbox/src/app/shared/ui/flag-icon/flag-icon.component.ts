import { Component, computed, input } from '@angular/core';
import { nationalityName } from '../../../core/models/player.model';

const FLAG_SHEET_COLUMNS = 17;
const FLAG_STEP_X = 18;
const FLAG_STEP_Y = 13;

const FLAG_SPRITE_INDEX: Record<string, number> = {
  CN: 41,
  TW: 189,
  KR: 179,
  EU: 65,
  US: 204,
  CA: 36,
};

@Component({
  selector: 'app-flag-icon',
  templateUrl: './flag-icon.component.html',
  styleUrl: './flag-icon.component.scss',
})
export class FlagIconComponent {
  readonly code = input.required<string>();
  readonly nationalityName = nationalityName;

  readonly offset = computed(() => {
    const spriteIndex = FLAG_SPRITE_INDEX[this.code()] ?? FLAG_SPRITE_INDEX['TW'];
    const index = spriteIndex - 1;
    const column = index % FLAG_SHEET_COLUMNS;
    const row = Math.floor(index / FLAG_SHEET_COLUMNS);
    return `-${column * FLAG_STEP_X}px -${row * FLAG_STEP_Y}px`;
  });
}
