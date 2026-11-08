import { Component, computed, input } from '@angular/core';
import type { PlayerPosition } from '../../../core/models/player.model';

export type RoleIconId = PlayerPosition | 'COACH';

const ROLE_ICON_SRC: Record<RoleIconId, string> = {
  TOP: 'role-icons/top.webp',
  JUNGLE: 'role-icons/jungle.webp',
  MID: 'role-icons/mid.webp',
  BOT: 'role-icons/bot.webp',
  SUPPORT: 'role-icons/support.webp',
  COACH: 'role-icons/coach.webp',
};

@Component({
  selector: 'app-role-icon',
  templateUrl: './role-icon.component.html',
  styleUrl: './role-icon.component.scss',
})
export class RoleIconComponent {
  readonly position = input.required<RoleIconId>();
  readonly src = computed(() => ROLE_ICON_SRC[this.position()]);
}
