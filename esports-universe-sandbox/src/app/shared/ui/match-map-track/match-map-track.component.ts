import { NgStyle } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import type { MatchReplayIcon, MatchReplayLogEntry } from '../../sim/derive-from-box';
import type {
  MatchMapChampionFrame,
  MatchMapFrame,
  MatchMapMonsterFrame,
  MatchMapStructureFrame,
} from '../../sim/match-stats';
import {
  mapObjectiveIcon,
  scoreboardIconStyle,
  type ScoreboardIconId,
  type ScoreboardSide,
} from '../../sim/scoreboard-icons';
import { ChampionIconComponent } from '../champion-icon/champion-icon.component';

const MAP_MAX = 15000;

@Component({
  selector: 'app-match-map-track',
  imports: [NgStyle, ChampionIconComponent],
  templateUrl: './match-map-track.component.html',
  styleUrl: './match-map-track.component.scss',
})
export class MatchMapTrackComponent {
  readonly frames = input.required<MatchMapFrame[]>();
  readonly homeLabel = input('藍方');
  readonly awayLabel = input('紅方');
  readonly events = input<MatchReplayLogEntry[]>([]);

  readonly frameIndex = signal(0);
  readonly selectedPlayerId = signal<string | null>(null);

  readonly frameCount = computed(() => this.frames().length);

  readonly current = computed(() => {
    const list = this.frames();
    if (list.length === 0) {
      return null;
    }
    const index = Math.min(Math.max(0, this.frameIndex()), list.length - 1);
    return list[index];
  });

  readonly clockLabel = computed(() => {
    const frame = this.current();
    if (!frame) {
      return '0:00';
    }
    const t = Math.max(0, Math.floor(frame.t));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  });

  readonly currentTime = computed(() => this.current()?.t ?? 0);

  readonly visibleEvents = computed(() => {
    const t = this.currentTime();
    return this.events().filter((entry) => entry.t <= t + 2);
  });

  readonly mapStructures = computed(() => this.current()?.structures ?? []);

  readonly jungleMonsters = computed(() => {
    const frame = this.current();
    return (frame?.monsters ?? []).filter(
      (monster) =>
        monster.campId !== 'dragon' &&
        monster.campId !== 'baron' &&
        monster.campId !== 'herald',
    );
  });

  readonly objectiveMonsters = computed(() => {
    const frame = this.current();
    return (frame?.monsters ?? []).filter(
      (monster) =>
        monster.campId === 'dragon' ||
        monster.campId === 'baron' ||
        monster.campId === 'herald',
    );
  });

  readonly minionCount = computed(() => this.current()?.minions.length ?? 0);

  mapX(x: number): number {
    return (x / MAP_MAX) * 100;
  }

  mapY(y: number): number {
    return (1 - y / MAP_MAX) * 100;
  }

  hpPct(champ: MatchMapChampionFrame): number {
    return Math.max(0, Math.min(100, (champ.hp / Math.max(1, champ.maxHp)) * 100));
  }

  structureIconStyle(structure: MatchMapStructureFrame): Record<string, string> {
    const side = structure.side as ScoreboardSide;
    const icon: ScoreboardIconId =
      structure.kind === 'nexus' || structure.kind === 'inhibitor' ? 'voidgrub' : 'tower';
    const size =
      structure.kind === 'nexus'
        ? 34
        : structure.kind === 'inhibitor'
          ? 30
          : structure.kind.includes('outer')
            ? 28
            : 26;
    return scoreboardIconStyle(icon, side, size, { destroyed: !structure.alive });
  }

  objectiveIconStyle(monster: MatchMapMonsterFrame): Record<string, string> | null {
    const icon = mapObjectiveIcon(monster.campId);
    if (!icon) {
      return null;
    }
    return scoreboardIconStyle(icon, 'blue', 32);
  }

  objectiveLabel(monster: MatchMapMonsterFrame): string {
    if (monster.campId === 'dragon') {
      return '龍';
    }
    if (monster.campId === 'baron') {
      return '巴龍';
    }
    return '先鋒';
  }

  feedIconStyle(entry: MatchReplayLogEntry): Record<string, string> | null {
    const icon = this.toScoreboardIcon(entry.icon);
    if (!icon) {
      return null;
    }
    const side = (entry.side ?? 'blue') as ScoreboardSide;
    return scoreboardIconStyle(icon, side, 28);
  }

  private toScoreboardIcon(icon: MatchReplayIcon): ScoreboardIconId | null {
    if (icon === 'kill') {
      return null;
    }
    if (icon === 'inhibitor' || icon === 'nexus') {
      return 'voidgrub';
    }
    return icon;
  }

  onScrub(raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    this.frameIndex.set(Math.round(value));
  }

  selectChampion(playerId: string): void {
    this.selectedPlayerId.update((current) => (current === playerId ? null : playerId));
  }

  step(delta: number): void {
    const max = Math.max(0, this.frameCount() - 1);
    this.frameIndex.update((index) => Math.min(max, Math.max(0, index + delta)));
  }
}
