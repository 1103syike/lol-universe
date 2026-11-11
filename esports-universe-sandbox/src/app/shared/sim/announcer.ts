export type AnnouncerKind =
  | 'first-blood'
  | 'double-kill'
  | 'triple-kill'
  | 'quadra-kill'
  | 'penta-kill'
  | 'ace'
  | 'shutdown'
  | 'killing-spree'
  | 'rampage'
  | 'unstoppable'
  | 'dominating'
  | 'godlike'
  | 'legendary'
  | 'mistake'
  | 'kill';

export type AnnouncerTone =
  | 'fb'
  | 'multi'
  | 'ace'
  | 'shutdown'
  | 'spree'
  | 'mistake'
  | 'kill'
  | 'dragon'
  | 'baron'
  | 'tower'
  | 'nexus'
  | 'env';

export interface AnnouncerCall {
  kind: AnnouncerKind;
  label: string;
  tone: AnnouncerTone;
}

export function objectiveAnnounce(input: {
  objectiveLabel: string;
  icon: string;
  kind: 'objective' | 'end';
}): AnnouncerCall {
  if (input.kind === 'end' || input.icon === 'nexus') {
    return { kind: 'kill', label: '摧毀主堡', tone: 'env' };
  }
  if (input.icon === 'tower') {
    return { kind: 'kill', label: '拆除防禦塔', tone: 'env' };
  }
  if (input.icon === 'inhibitor') {
    return { kind: 'kill', label: '拆除兵營', tone: 'env' };
  }
  if (input.icon === 'baron') {
    return { kind: 'kill', label: '拿下巴龍', tone: 'env' };
  }
  if (input.icon === 'elder') {
    return { kind: 'kill', label: '拿下遠古龍', tone: 'env' };
  }
  if (input.icon === 'herald') {
    return { kind: 'kill', label: '拿下預示者', tone: 'env' };
  }
  if (input.icon === 'voidgrub') {
    return { kind: 'kill', label: '拿下虛空幼體', tone: 'env' };
  }
  if (input.objectiveLabel === '龍魂') {
    return { kind: 'kill', label: '拿下龍魂', tone: 'env' };
  }
  if (input.icon === 'dragon' || input.objectiveLabel.includes('龍')) {
    return { kind: 'kill', label: `拿下${input.objectiveLabel || '小龍'}`, tone: 'env' };
  }
  return { kind: 'kill', label: `拿下${input.objectiveLabel || '資源'}`, tone: 'env' };
}

export function environmentalAnnounce(label: string): AnnouncerCall {
  return { kind: 'mistake', label, tone: 'env' };
}

const MULTI_KILL_WINDOW_SEC = 10;
const PENTA_WINDOW_SEC = 30;
const SPREE_SHUTDOWN_MIN = 3;

const STREAK_CALLS: ReadonlyArray<{ min: number; kind: AnnouncerKind; label: string }> = [
  { min: 8, kind: 'legendary', label: '超神了' },
  { min: 7, kind: 'godlike', label: '如同神一般' },
  { min: 6, kind: 'dominating', label: '主宰比賽' },
  { min: 5, kind: 'unstoppable', label: '無人可擋' },
  { min: 4, kind: 'rampage', label: '殺人如麻' },
  { min: 3, kind: 'killing-spree', label: '大殺特殺' },
];

export interface KillAnnounceInput {
  t: number;
  killerId: string | null | undefined;
  victimId: string | null | undefined;
  victimTeamPlayerIds: readonly string[];
  isFirstBlood: boolean;
  isMistake: boolean;
}

export class KillAnnouncerTracker {
  private readonly streak = new Map<string, number>();
  private readonly multiCount = new Map<string, number>();
  private readonly multiUntil = new Map<string, number>();
  private readonly deadUntil = new Map<string, number>();

  observe(input: KillAnnounceInput): AnnouncerCall {
    const killerId = input.killerId ?? '';
    const victimId = input.victimId ?? '';
    const victimStreak = victimId ? (this.streak.get(victimId) ?? 0) : 0;

    if (victimId) {
      this.streak.set(victimId, 0);
      this.multiCount.delete(victimId);
      this.multiUntil.delete(victimId);
      this.deadUntil.set(victimId, input.t + estimateRespawnSec(input.t));
    }

    let multi = 1;
    if (killerId) {
      const prevMulti = this.multiCount.get(killerId) ?? 0;
      const until = this.multiUntil.get(killerId) ?? 0;
      const windowSec = prevMulti >= 4 ? PENTA_WINDOW_SEC : MULTI_KILL_WINDOW_SEC;
      if (prevMulti > 0 && input.t <= until) {
        multi = Math.min(5, prevMulti + 1);
      } else {
        multi = 1;
      }
      this.multiCount.set(killerId, multi);
      this.multiUntil.set(
        killerId,
        input.t + (multi >= 4 ? PENTA_WINDOW_SEC : MULTI_KILL_WINDOW_SEC),
      );
      const nextStreak = (this.streak.get(killerId) ?? 0) + 1;
      this.streak.set(killerId, nextStreak);
    }

    const aced =
      input.victimTeamPlayerIds.length > 0 &&
      input.victimTeamPlayerIds.every((id) => (this.deadUntil.get(id) ?? 0) > input.t);

    if (input.isFirstBlood) {
      return { kind: 'first-blood', label: '首殺', tone: 'fb' };
    }
    if (multi >= 5) {
      return { kind: 'penta-kill', label: '五殺', tone: 'multi' };
    }
    if (multi >= 4) {
      return { kind: 'quadra-kill', label: '四殺', tone: 'multi' };
    }
    if (multi >= 3) {
      return { kind: 'triple-kill', label: '三殺', tone: 'multi' };
    }
    if (multi >= 2) {
      return { kind: 'double-kill', label: '雙殺', tone: 'multi' };
    }
    if (aced) {
      return { kind: 'ace', label: '團滅', tone: 'ace' };
    }
    if (victimStreak >= SPREE_SHUTDOWN_MIN) {
      return { kind: 'shutdown', label: '終結', tone: 'shutdown' };
    }
    if (killerId) {
      const streak = this.streak.get(killerId) ?? 0;
      for (const entry of STREAK_CALLS) {
        if (streak >= entry.min) {
          return { kind: entry.kind, label: entry.label, tone: 'spree' };
        }
      }
    }
    if (input.isMistake) {
      return { kind: 'mistake', label: '失誤', tone: 'mistake' };
    }
    return { kind: 'kill', label: '擊殺', tone: 'kill' };
  }
}

function estimateRespawnSec(t: number): number {
  const minutes = Math.max(0, t / 60);
  return Math.min(52, Math.round(10 + minutes * 2.4));
}

export function announcerToneClass(tone: AnnouncerTone | undefined): string {
  switch (tone) {
    case 'fb':
      return 'is-fb';
    case 'multi':
      return 'is-multi';
    case 'ace':
      return 'is-ace';
    case 'shutdown':
      return 'is-shutdown';
    case 'spree':
      return 'is-spree';
    case 'mistake':
      return 'is-mistake';
    case 'dragon':
      return 'is-dragon';
    case 'baron':
      return 'is-baron';
    case 'tower':
      return 'is-tower';
    case 'nexus':
      return 'is-nexus';
    case 'env':
      return 'is-env';
    default:
      return 'is-kill';
  }
}
