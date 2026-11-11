import { NgStyle } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { announcerToneClass } from '../../sim/announcer';
import type { MatchReplayIcon, MatchReplayLogEntry } from '../../sim/derive-from-box';
import type {
  MatchMapChampionFrame,
  MatchMapFrame,
  MatchMapMinionFrame,
  MatchMapMonsterFrame,
  MatchMapStructureFrame,
  MatchMapWardFrame,
} from '../../sim/match-stats';
import {
  buildingIconSize,
  buildingIconStyle,
  buildingIconUrl,
  isBuildingIconId,
  structureKindToBuildingIcon,
} from '../../sim/building-icons';
import { minionIconStyle } from '../../sim/minion-icons';
import { monsterIconStyle } from '../../sim/monster-icons';
import {
  mapObjectiveIcon,
  scoreboardIconStyle,
  type ScoreboardIconId,
  type ScoreboardSide,
} from '../../sim/scoreboard-icons';
import {
  xpNeededForLevel,
  xpProgressInLevel,
} from '../../sim/xp-curve';
import {
  CHAMPION_SIGHT,
  FOUNTAIN_SIGHT,
  MINION_SIGHT,
  SUPER_MINION_SIGHT,
  TOWER_SIGHT,
  WARD_ICON_CONTROL,
  WARD_ICON_STEALTH,
} from '../../sim-v2/vision/vision';
import { AbilityIconComponent } from '../ability-icon/ability-icon.component';
import { ChampionIconComponent } from '../champion-icon/champion-icon.component';
import { SummonerIconComponent } from '../summoner-icon/summoner-icon.component';

const SKILL_ORDER = ['Q', 'W', 'E', 'R'] as const;
const SUMMONER_ORDER = ['D', 'F'] as const;
type FogSide = 'blue' | 'red' | 'both' | 'off';

interface VisionBlob {
  id: string;
  x: number;
  y: number;
  sight: number;
  kind: 'champ' | 'ward' | 'tower' | 'inhibitor' | 'nexus' | 'fountain' | 'minion';
  wardKind?: 'stealth' | 'control';
  side: 'blue' | 'red';
}

export interface ScoreboardSkillSlot {
  slot: string;
  level: number;
  name: string;
  cooldownRemaining: number;
  ready: boolean;
  title: string;
}

export interface ScoreboardSummonerSlot {
  slot: string;
  id: string;
  cooldownRemaining: number;
  ready: boolean;
}

const MAP_MAX = 15000;
const PLAYBACK_SPEEDS = [1, 2, 4, 8, 16] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function findFrameFloor(frames: MatchMapFrame[], time: number): number {
  if (frames.length === 0) {
    return 0;
  }
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (frames[mid].t <= time) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

const TELEPORT_JUMP = 1600;

function flashJustCast(
  left: MatchMapChampionFrame,
  right: MatchMapChampionFrame,
): boolean {
  const leftFlash = (left.summonerSpells ?? []).find((spell) => spell.id === 'Flash');
  const rightFlash = (right.summonerSpells ?? []).find((spell) => spell.id === 'Flash');
  if (!leftFlash || !rightFlash) {
    return false;
  }
  return leftFlash.cooldownRemaining < 8 && rightFlash.cooldownRemaining > 60;
}

function interpolateChampions(
  from: MatchMapChampionFrame[],
  to: MatchMapChampionFrame[],
  u: number,
): MatchMapChampionFrame[] {
  const toById = new Map(to.map((champ) => [champ.playerId, champ]));
  return from.map((left) => {
    const right = toById.get(left.playerId);
    if (!right) {
      return left;
    }
    const jump = Math.hypot(right.x - left.x, right.y - left.y);
    const leftRecalling = !!left.recalling;
    const rightRecalling = !!right.recalling;
    const isRecallTeleport =
      jump >= TELEPORT_JUMP || (leftRecalling && !rightRecalling && jump >= 700);
    const isFlashJump = !isRecallTeleport && flashJustCast(left, right) && jump >= 180;
    if (isRecallTeleport) {
      if (u < 0.88) {
        return {
          ...left,
          recalling: true,
          recallProgress: Math.max(
            left.recallProgress ?? (leftRecalling ? 0.85 : 0),
            Math.min(1, (left.recallProgress ?? 0.7) + u * 0.25),
          ),
          hp: lerp(left.hp, right.hp, u),
          earnedGold: left.earnedGold ?? 0,
          kills: left.kills ?? 0,
          deaths: left.deaths ?? 0,
          assists: left.assists ?? 0,
          damageToChamps: left.damageToChamps ?? 0,
          damageTaken: left.damageTaken ?? 0,
          damageTakenFromChamps:
            left.damageTakenFromChamps ?? left.damageTaken ?? 0,
          cs: left.cs ?? 0,
          visionScore: left.visionScore ?? 0,
        };
      }
      return {
        ...right,
        recalling: false,
        recallProgress: 0,
        alive: right.alive,
        level: right.level,
        items: right.items,
        earnedGold: right.earnedGold ?? 0,
        kills: right.kills ?? 0,
        deaths: right.deaths ?? 0,
        assists: right.assists ?? 0,
        damageToChamps: right.damageToChamps ?? 0,
        damageTaken: right.damageTaken ?? 0,
        damageTakenFromChamps:
          right.damageTakenFromChamps ?? right.damageTaken ?? 0,
        cs: right.cs ?? 0,
        visionScore: right.visionScore ?? 0,
      };
    }
    if (isFlashJump) {
      const snapped = u < 0.55 ? left : right;
      return {
        ...right,
        x: snapped.x,
        y: snapped.y,
        hp: lerp(left.hp, right.hp, u),
        gold: lerp(left.gold, right.gold, u),
        earnedGold: lerp(left.earnedGold ?? 0, right.earnedGold ?? 0, u),
        recalling: false,
        recallProgress: 0,
        alive: snapped.alive,
        level: snapped.level,
        items: snapped.items,
        kills: snapped.kills ?? 0,
        deaths: snapped.deaths ?? 0,
        assists: snapped.assists ?? 0,
        damageToChamps: lerp(
          left.damageToChamps ?? 0,
          right.damageToChamps ?? 0,
          u,
        ),
        damageTaken: lerp(left.damageTaken ?? 0, right.damageTaken ?? 0, u),
        damageTakenFromChamps: lerp(
          left.damageTakenFromChamps ?? left.damageTaken ?? 0,
          right.damageTakenFromChamps ?? right.damageTaken ?? 0,
          u,
        ),
        cs: lerp(left.cs ?? 0, right.cs ?? 0, u),
        visionScore: lerp(left.visionScore ?? 0, right.visionScore ?? 0, u),
        mana: lerp(left.mana ?? 0, right.mana ?? 0, u),
        maxMana: snapped.maxMana ?? right.maxMana ?? left.maxMana,
        exp: snapped.exp ?? right.exp ?? left.exp,
        abilities: snapped.abilities ?? right.abilities ?? left.abilities,
        summonerSpells:
          snapped.summonerSpells ?? right.summonerSpells ?? left.summonerSpells,
      };
    }
    const stats = u < 0.5 ? left : right;
    return {
      ...right,
      x: lerp(left.x, right.x, u),
      y: lerp(left.y, right.y, u),
      hp: lerp(left.hp, right.hp, u),
      alive: stats.alive,
      level: stats.level,
      gold: lerp(left.gold, right.gold, u),
      earnedGold: lerp(left.earnedGold ?? 0, right.earnedGold ?? 0, u),
      kills: stats.kills ?? 0,
      deaths: stats.deaths ?? 0,
      assists: stats.assists ?? 0,
      damageToChamps: lerp(
        left.damageToChamps ?? 0,
        right.damageToChamps ?? 0,
        u,
      ),
      damageTaken: lerp(left.damageTaken ?? 0, right.damageTaken ?? 0, u),
      damageTakenFromChamps: lerp(
        left.damageTakenFromChamps ?? left.damageTaken ?? 0,
        right.damageTakenFromChamps ?? right.damageTaken ?? 0,
        u,
      ),
      cs: lerp(left.cs ?? 0, right.cs ?? 0, u),
      visionScore: lerp(left.visionScore ?? 0, right.visionScore ?? 0, u),
      items: stats.items,
      mana: lerp(left.mana ?? 0, right.mana ?? 0, u),
      maxMana: stats.maxMana ?? right.maxMana ?? left.maxMana,
      exp: stats.exp ?? right.exp ?? left.exp,
      abilities: stats.abilities ?? right.abilities ?? left.abilities,
      summonerSpells: stats.summonerSpells ?? right.summonerSpells ?? left.summonerSpells,
      recalling: u < 0.5 ? leftRecalling : rightRecalling,
      recallProgress: lerp(left.recallProgress ?? 0, right.recallProgress ?? 0, u),
    };
  });
}

const ROLE_ORDER: Record<string, number> = {
  TOP: 0,
  JUNGLE: 1,
  MID: 2,
  BOT: 3,
  SUPPORT: 4,
};

function interpolateMinions(
  from: MatchMapMinionFrame[],
  to: MatchMapMinionFrame[],
  u: number,
): MatchMapMinionFrame[] {
  const fromById = new Map(from.map((minion) => [minion.id, minion]));
  const toById = new Map(to.map((minion) => [minion.id, minion]));
  const out: MatchMapMinionFrame[] = [];
  for (const id of new Set([...fromById.keys(), ...toById.keys()])) {
    const left = fromById.get(id);
    const right = toById.get(id);
    if (left && right) {
      out.push({
        ...right,
        x: lerp(left.x, right.x, u),
        y: lerp(left.y, right.y, u),
        hp: lerp(left.hp ?? right.hp, right.hp ?? left.hp, u),
        maxHp: right.maxHp || left.maxHp || 1,
      });
      continue;
    }
    if (left && u < 0.9) {
      out.push(left);
      continue;
    }
    if (right && u > 0.1) {
      out.push(right);
    }
  }
  return out;
}

function buildDisplayFrame(frames: MatchMapFrame[], time: number): MatchMapFrame | null {
  if (frames.length === 0) {
    return null;
  }
  if (time <= frames[0].t) {
    return frames[0];
  }
  const last = frames[frames.length - 1];
  if (time >= last.t) {
    return last;
  }
  const floor = findFrameFloor(frames, time);
  const a = frames[floor];
  const b = frames[Math.min(frames.length - 1, floor + 1)];
  if (a === b || b.t <= a.t) {
    return a;
  }
  const u = Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t)));
  return {
    t: time,
    champions: interpolateChampions(a.champions, b.champions, u),
    minions: interpolateMinions(a.minions, b.minions, u),
    monsters: interpolateMonsters(a.monsters, b.monsters, u),
    structures: interpolateStructures(a.structures, b.structures, u),
    wards: interpolateWards(a.wards ?? [], b.wards ?? [], u),
  };
}

function interpolateStructures(
  from: MatchMapStructureFrame[],
  to: MatchMapStructureFrame[],
  u: number,
): MatchMapStructureFrame[] {
  const fromById = new Map(from.map((structure) => [structure.id, structure]));
  const toById = new Map(to.map((structure) => [structure.id, structure]));
  const out: MatchMapStructureFrame[] = [];
  for (const id of new Set([...fromById.keys(), ...toById.keys()])) {
    const left = fromById.get(id);
    const right = toById.get(id);
    if (left && right) {
      out.push({
        ...right,
        hp: lerp(left.hp ?? right.hp, right.hp ?? left.hp, u),
        maxHp: right.maxHp || left.maxHp || 1,
      });
      continue;
    }
    if (left && u < 0.9) {
      out.push(left);
      continue;
    }
    if (right && u > 0.1) {
      out.push(right);
    }
  }
  return out;
}

function interpolateMonsters(
  from: MatchMapMonsterFrame[],
  to: MatchMapMonsterFrame[],
  u: number,
): MatchMapMonsterFrame[] {
  const fromById = new Map(from.map((monster) => [monster.id, monster]));
  const toById = new Map(to.map((monster) => [monster.id, monster]));
  const out: MatchMapMonsterFrame[] = [];
  for (const id of new Set([...fromById.keys(), ...toById.keys()])) {
    const left = fromById.get(id);
    const right = toById.get(id);
    if (left && right) {
      out.push({
        ...right,
        x: lerp(left.x, right.x, u),
        y: lerp(left.y, right.y, u),
        hp: lerp(left.hp ?? right.hp, right.hp ?? left.hp, u),
        maxHp: right.maxHp || left.maxHp || 1,
      });
      continue;
    }
    if (left && u < 0.9) {
      out.push(left);
      continue;
    }
    if (right && u > 0.1) {
      out.push(right);
    }
  }
  return out;
}

function interpolateWards(
  from: MatchMapWardFrame[],
  to: MatchMapWardFrame[],
  u: number,
): MatchMapWardFrame[] {
  const fromById = new Map(from.map((ward) => [ward.id, ward]));
  const toById = new Map(to.map((ward) => [ward.id, ward]));
  const out: MatchMapWardFrame[] = [];
  for (const id of new Set([...fromById.keys(), ...toById.keys()])) {
    const left = fromById.get(id);
    const right = toById.get(id);
    if (left && right) {
      out.push({
        ...right,
        x: lerp(left.x, right.x, u),
        y: lerp(left.y, right.y, u),
        hp: lerp(left.hp ?? right.hp, right.hp ?? left.hp, u),
        maxHp: right.maxHp || left.maxHp || 1,
      });
      continue;
    }
    if (left && u < 0.9) {
      out.push(left);
      continue;
    }
    if (right && u > 0.1) {
      out.push(right);
    }
  }
  return out;
}

@Component({
  selector: 'app-match-map-track',
  imports: [
    NgStyle,
    AbilityIconComponent,
    ChampionIconComponent,
    SummonerIconComponent,
  ],
  templateUrl: './match-map-track.component.html',
  styleUrl: './match-map-track.component.scss',
})
export class MatchMapTrackComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly frames = input.required<MatchMapFrame[]>();
  readonly homeLabel = input('藍方');
  readonly awayLabel = input('紅方');
  readonly events = input<MatchReplayLogEntry[]>([]);

  readonly frameIndex = signal(0);
  readonly playbackTime = signal(0);
  readonly selectedPlayerId = signal<string | null>(null);
  readonly playing = signal(false);
  readonly speed = signal<PlaybackSpeed>(8);
  readonly speeds = PLAYBACK_SPEEDS;
  readonly fogSide = signal<FogSide>('both');
  private readonly maskUid = Math.random().toString(36).slice(2, 9);
  readonly fogMaskId = `match-fog-${this.maskUid}`;
  readonly visionBlueMaskId = `match-vision-blue-${this.maskUid}`;
  readonly visionRedMaskId = `match-vision-red-${this.maskUid}`;

  private rafId: number | null = null;
  private lastRafMs = 0;

  readonly frameCount = computed(() => this.frames().length);

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
    effect(() => {
      this.frames();
      this.frameIndex.set(0);
      this.playbackTime.set(0);
      this.playing.set(false);
      this.stopTimer();
    });
    effect(() => {
      const playing = this.playing();
      const speed = this.speed();
      if (!playing) {
        this.stopTimer();
        return;
      }
      this.startTimer(speed);
    });
  }

  readonly current = computed(() => buildDisplayFrame(this.frames(), this.playbackTime()));

  readonly clockLabel = computed(() => {
    const t = Math.max(0, Math.floor(this.playbackTime()));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  });

  readonly currentTime = computed(() => this.playbackTime());

  readonly timelineEvents = computed(() => this.events());

  readonly mapStructures = computed(() => this.current()?.structures ?? []);

  readonly jungleMonsters = computed(() => {
    const frame = this.current();
    return (frame?.monsters ?? []).filter(
      (monster) =>
        monster.campId !== 'dragon' &&
        monster.campId !== 'elder' &&
        monster.campId !== 'baron' &&
        monster.campId !== 'herald',
    );
  });

  readonly objectiveMonsters = computed(() => {
    const frame = this.current();
    return (frame?.monsters ?? []).filter(
      (monster) =>
        monster.campId === 'dragon' ||
        monster.campId === 'elder' ||
        monster.campId === 'baron' ||
        monster.campId === 'herald',
    );
  });

  readonly minionCount = computed(() => this.current()?.minions.length ?? 0);

  readonly scoreboardBlue = computed(() => this.scoreboardSide('blue'));
  readonly scoreboardRed = computed(() => this.scoreboardSide('red'));

  readonly teamGoldBlue = computed(() =>
    this.scoreboardBlue().reduce((sum, champ) => sum + (champ.earnedGold ?? 0), 0),
  );
  readonly teamGoldRed = computed(() =>
    this.scoreboardRed().reduce((sum, champ) => sum + (champ.earnedGold ?? 0), 0),
  );
  readonly laneGoldDiffs = computed(() => {
    const blueByRole = new Map(
      this.scoreboardBlue().map((champ) => [champ.position, champ.earnedGold ?? 0]),
    );
    const redByRole = new Map(
      this.scoreboardRed().map((champ) => [champ.position, champ.earnedGold ?? 0]),
    );
    return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((role) => {
      const blue = blueByRole.get(role) ?? 0;
      const red = redByRole.get(role) ?? 0;
      return {
        role,
        label: this.roleLabel(role),
        blue,
        red,
        diff: blue - red,
      };
    });
  });

  readonly visionBlobs = computed((): VisionBlob[] => {
    const fog = this.fogSide();
    const frame = this.current();
    if (!frame || fog === 'off') {
      return [];
    }
    const blobs: VisionBlob[] = [];
    const includeSide = (unitSide: 'blue' | 'red') =>
      fog === 'both' || unitSide === fog;
    for (const champ of frame.champions) {
      if (!champ.alive || !includeSide(champ.side)) {
        continue;
      }
      blobs.push({
        id: `champ-${champ.playerId}`,
        x: champ.x,
        y: champ.y,
        sight: CHAMPION_SIGHT,
        kind: 'champ',
        side: champ.side,
      });
    }
    for (const structure of frame.structures) {
      if (!structure.alive || !includeSide(structure.side)) {
        continue;
      }
      if (!structure.kind.includes('tower')) {
        continue;
      }
      blobs.push({
        id: `struct-${structure.id}`,
        x: structure.x,
        y: structure.y,
        sight: TOWER_SIGHT,
        kind: 'tower',
        side: structure.side,
      });
    }
    for (const minion of frame.minions) {
      if (!includeSide(minion.side)) {
        continue;
      }
      blobs.push({
        id: `minion-${minion.id}`,
        x: minion.x,
        y: minion.y,
        sight: minion.role === 'super' ? SUPER_MINION_SIGHT : MINION_SIGHT,
        kind: 'minion',
        side: minion.side,
      });
    }
    for (const ward of frame.wards ?? []) {
      if (!includeSide(ward.side)) {
        continue;
      }
      blobs.push({
        id: `ward-${ward.id}`,
        x: ward.x,
        y: ward.y,
        sight: ward.sight || 900,
        kind: 'ward',
        wardKind: ward.wardKind,
        side: ward.side,
      });
    }
    if (fog === 'blue' || fog === 'both') {
      blobs.push({
        id: 'fountain-blue',
        x: 400,
        y: 400,
        sight: FOUNTAIN_SIGHT,
        kind: 'fountain',
        side: 'blue',
      });
    }
    if (fog === 'red' || fog === 'both') {
      blobs.push({
        id: 'fountain-red',
        x: 14600,
        y: 14600,
        sight: FOUNTAIN_SIGHT,
        kind: 'fountain',
        side: 'red',
      });
    }
    return blobs;
  });

  readonly visionBlobsBlue = computed(() =>
    this.visionBlobs().filter((blob) => blob.side === 'blue'),
  );

  readonly visionBlobsRed = computed(() =>
    this.visionBlobs().filter((blob) => blob.side === 'red'),
  );

  readonly visibleWards = computed(() => {
    const frame = this.current();
    const wards = frame?.wards ?? [];
    const fog = this.fogSide();
    if (fog === 'off') {
      return wards;
    }
    if (fog === 'both') {
      return wards;
    }
    return wards.filter(
      (ward) => ward.side === fog || this.pointVisibleToFog(ward.x, ward.y),
    );
  });

  private scoreboardSide(side: 'blue' | 'red'): MatchMapChampionFrame[] {
    return [...(this.current()?.champions ?? [])]
      .filter((champ) => champ.side === side)
      .sort(
        (left, right) =>
          (ROLE_ORDER[left.position] ?? 9) - (ROLE_ORDER[right.position] ?? 9),
      );
  }

  formatKda(champ: MatchMapChampionFrame): string {
    return `${champ.kills ?? 0}/${champ.deaths ?? 0}/${champ.assists ?? 0}`;
  }

  formatAmount(value: number | undefined): string {
    const amount = Math.max(0, Math.round(value ?? 0));
    if (amount >= 10000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return String(amount);
  }

  formatGoldDiff(value: number | undefined): string {
    const amount = Math.round(value ?? 0);
    if (amount === 0) {
      return '0';
    }
    const sign = amount > 0 ? '+' : '−';
    const abs = Math.abs(amount);
    if (abs >= 1000) {
      const k = abs / 1000;
      return `${sign}${k >= 10 ? k.toFixed(0) : k.toFixed(1)}K`;
    }
    return `${sign}${abs}`;
  }

  formatGold(value: number | undefined): string {
    const amount = Math.max(0, Math.round(value ?? 0));
    if (amount >= 1000) {
      const k = amount / 1000;
      return `${k >= 10 ? k.toFixed(0) : k.toFixed(1)}K`;
    }
    return String(amount);
  }

  formatCs(value: number | undefined): string {
    return String(Math.max(0, Math.round(value ?? 0)));
  }

  abilityRanks(champ: MatchMapChampionFrame): string {
    return this.skillSlots(champ)
      .map((ability) => `${ability.slot}${ability.level}`)
      .join(' ');
  }

  skillSlots(champ: MatchMapChampionFrame): ScoreboardSkillSlot[] {
    const bySlot = new Map((champ.abilities ?? []).map((ability) => [ability.slot, ability]));
    return SKILL_ORDER.map((slot) => {
      const ability = bySlot.get(slot);
      const level = ability?.level ?? 0;
      const cooldownRemaining = ability?.cooldownRemaining ?? 0;
      const name = ability?.name ?? `${champ.championId} ${slot}`;
      const ready = level > 0 && cooldownRemaining <= 0.05;
      return {
        slot,
        level,
        name,
        cooldownRemaining,
        ready,
        title: level > 0 ? `${name} · Lv${level}` : `${name} · 未學習`,
      };
    });
  }

  summonerSlots(champ: MatchMapChampionFrame): ScoreboardSummonerSlot[] {
    const bySlot = new Map(
      (champ.summonerSpells ?? []).map((spell) => [spell.slot, spell]),
    );
    return SUMMONER_ORDER.map((slot) => {
      const spell = bySlot.get(slot);
      const cooldownRemaining = spell?.cooldownRemaining ?? 0;
      return {
        slot,
        id: spell?.id ?? '',
        cooldownRemaining,
        ready: !!spell?.id && cooldownRemaining <= 0.05,
      };
    });
  }

  xpPercent(champ: MatchMapChampionFrame): number {
    return Math.round(xpProgressInLevel(champ.level, champ.exp ?? 0) * 100);
  }

  xpLabel(champ: MatchMapChampionFrame): string {
    const needed = xpNeededForLevel(champ.level);
    if (needed <= 0) {
      return `Lv${champ.level} 滿等`;
    }
    const progress = xpProgressInLevel(champ.level, champ.exp ?? 0);
    return `Lv${champ.level} 經驗 ${Math.round(progress * needed)}/${needed}`;
  }

  formatCooldown(seconds: number): string {
    const value = Math.max(0, seconds);
    if (value >= 10) {
      return String(Math.ceil(value));
    }
    return value.toFixed(1);
  }

  readonly focusedChampion = computed(() => {
    const id = this.selectedPlayerId();
    if (!id) {
      return null;
    }
    return this.current()?.champions.find((champ) => champ.playerId === id) ?? null;
  });

  roleTitle(position: string): string {
    if (position === 'TOP') {
      return '上路';
    }
    if (position === 'JUNGLE') {
      return '打野';
    }
    if (position === 'MID') {
      return '中路';
    }
    if (position === 'BOT') {
      return '下路';
    }
    if (position === 'SUPPORT') {
      return '輔助';
    }
    return position;
  }

  roleLabel(position: string): string {
    if (position === 'TOP') {
      return '上';
    }
    if (position === 'JUNGLE') {
      return '野';
    }
    if (position === 'MID') {
      return '中';
    }
    if (position === 'BOT') {
      return '下';
    }
    if (position === 'SUPPORT') {
      return '輔';
    }
    return position;
  }

  setFogSide(side: FogSide): void {
    this.fogSide.set(side);
  }

  sightRadiusPct(sight: number): number {
    return (Math.max(0, sight) / MAP_MAX) * 100;
  }

  wardIconSrc(wardKind: string): string {
    return wardKind === 'control' ? WARD_ICON_CONTROL : WARD_ICON_STEALTH;
  }

  pointVisibleToFog(x: number, y: number): boolean {
    if (this.fogSide() === 'off') {
      return true;
    }
    for (const blob of this.visionBlobs()) {
      if (Math.hypot(blob.x - x, blob.y - y) <= blob.sight) {
        return true;
      }
    }
    return false;
  }

  isHiddenByFog(side: 'blue' | 'red', x: number, y: number): boolean {
    const fog = this.fogSide();
    if (fog === 'off') {
      return false;
    }
    if (fog === 'both' || side === fog) {
      return false;
    }
    return !this.pointVisibleToFog(x, y);
  }

  mapX(x: number): number {
    return (x / MAP_MAX) * 100;
  }

  mapY(y: number): number {
    return (1 - y / MAP_MAX) * 100;
  }

  hpPct(champ: MatchMapChampionFrame): number {
    return Math.max(0, Math.min(100, (champ.hp / Math.max(1, champ.maxHp)) * 100));
  }

  minionHpPct(minion: MatchMapMinionFrame): number {
    return Math.max(0, Math.min(100, (minion.hp / Math.max(1, minion.maxHp || 1)) * 100));
  }

  monsterHpPct(monster: MatchMapMonsterFrame): number {
    return Math.max(0, Math.min(100, (monster.hp / Math.max(1, monster.maxHp || 1)) * 100));
  }

  wardHpPct(ward: MatchMapWardFrame): number {
    return Math.max(0, Math.min(100, (ward.hp / Math.max(1, ward.maxHp || 1)) * 100));
  }

  structureHpPct(structure: MatchMapStructureFrame): number {
    if (!structure.alive) {
      return 0;
    }
    return Math.max(0, Math.min(100, (structure.hp / Math.max(1, structure.maxHp || 1)) * 100));
  }

  structureTitle(structure: MatchMapStructureFrame): string {
    if (!structure.alive) {
      return `${structure.structureId}（已摧毀）`;
    }
    return `${structure.structureId} · HP ${Math.round(structure.hp)}/${Math.round(structure.maxHp)}`;
  }

  minionHpBar(minion: MatchMapMinionFrame): {
    x: number;
    y: number;
    width: number;
    fill: number;
  } {
    const width = minion.role === 'cannon' || minion.role === 'super' ? 2.2 : 1.7;
    return {
      x: this.mapX(minion.x) - width / 2,
      y: this.mapY(minion.y) + (minion.role === 'cannon' || minion.role === 'super' ? 1.15 : 0.85),
      width,
      fill: (width * this.minionHpPct(minion)) / 100,
    };
  }

  monsterHpBar(monster: MatchMapMonsterFrame): {
    x: number;
    y: number;
    width: number;
    fill: number;
  } {
    const isEpic =
      monster.campId === 'dragon' ||
      monster.campId === 'elder' ||
      monster.campId === 'baron' ||
      monster.campId === 'herald';
    const width = isEpic ? 2.6 : 1.9;
    return {
      x: this.mapX(monster.x) - width / 2,
      y: this.mapY(monster.y) + (isEpic ? 1.45 : 1.05),
      width,
      fill: (width * this.monsterHpPct(monster)) / 100,
    };
  }

  structureBuildingSrc(structure: MatchMapStructureFrame): string {
    const kind = structureKindToBuildingIcon(structure.kind);
    return buildingIconUrl(kind, structure.side as 'blue' | 'red');
  }

  structureBuildingSize(structure: MatchMapStructureFrame): number {
    return buildingIconSize(structureKindToBuildingIcon(structure.kind));
  }

  wardTitle(ward: MatchMapWardFrame): string {
    const team = ward.side === 'blue' ? '藍' : '紅';
    const kind = ward.wardKind === 'control' ? '紅眼（控制守衛）' : '黃眼（隱身守衛）';
    const owner = ward.ownerGamertag ? ` · ${ward.ownerGamertag}` : '';
    return `${team}方${kind}${owner} · HP ${Math.round(ward.hp)}/${Math.round(ward.maxHp)}`;
  }

  objectiveIconStyle(monster: MatchMapMonsterFrame): Record<string, string> | null {
    const icon = mapObjectiveIcon(monster.campId);
    if (!icon) {
      return null;
    }
    return scoreboardIconStyle(icon, 'blue', 32);
  }

  objectiveLabel(monster: MatchMapMonsterFrame): string {
    const hp = ` · HP ${Math.round(monster.hp)}/${Math.round(monster.maxHp)}`;
    if (monster.campId === 'dragon') {
      return `龍${hp}`;
    }
    if (monster.campId === 'elder') {
      return `遠古龍${hp}`;
    }
    if (monster.campId === 'baron') {
      return `巴龍${hp}`;
    }
    return `先鋒${hp}`;
  }

  feedIconStyle(entry: MatchReplayLogEntry): Record<string, string> | null {
    if (entry.objectiveIconId) {
      return monsterIconStyle(entry.objectiveIconId, 34);
    }
    if (isBuildingIconId(entry.icon)) {
      const ownedSide: ScoreboardSide =
        entry.side === 'blue' ? 'red' : entry.side === 'red' ? 'blue' : 'blue';
      return buildingIconStyle(entry.icon, ownedSide, 34);
    }
    const icon = this.toScoreboardIcon(entry.icon);
    if (!icon) {
      return null;
    }
    const side = (entry.side ?? 'blue') as ScoreboardSide;
    return scoreboardIconStyle(icon, side, 28);
  }

  feedMinionStyle(entry: MatchReplayLogEntry): Record<string, string> | null {
    const minion = entry.killerMinion;
    if (!minion) {
      return null;
    }
    return minionIconStyle(minion.role, minion.side, 34);
  }

  feedMonsterStyle(entry: MatchReplayLogEntry): Record<string, string> | null {
    const monster = entry.killerMonster;
    if (!monster) {
      return null;
    }
    return monsterIconStyle(monster.iconId, 34);
  }

  feedBuildingKillerStyle(entry: MatchReplayLogEntry): Record<string, string> | null {
    const building = entry.killerBuilding;
    if (!building) {
      return null;
    }
    return buildingIconStyle(building.kind, building.side, 34);
  }

  announceToneClass(entry: MatchReplayLogEntry): string {
    return announcerToneClass(entry.announceTone);
  }

  private toScoreboardIcon(icon: MatchReplayIcon): ScoreboardIconId | null {
    if (icon === 'kill') {
      return null;
    }
    return icon === 'voidgrub' ||
      icon === 'dragon' ||
      icon === 'baron' ||
      icon === 'elder' ||
      icon === 'tower' ||
      icon === 'herald' ||
      icon === 'inhibitor' ||
      icon === 'nexus'
      ? icon
      : null;
  }

  onScrub(raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    this.playing.set(false);
    const list = this.frames();
    const index = Math.min(Math.max(0, Math.round(value)), Math.max(0, list.length - 1));
    this.frameIndex.set(index);
    this.playbackTime.set(list[index]?.t ?? 0);
  }

  seekToTime(time: number): void {
    if (!Number.isFinite(time)) {
      return;
    }
    const list = this.frames();
    if (list.length === 0) {
      return;
    }
    this.playing.set(false);
    const endT = list[list.length - 1]?.t ?? 0;
    const target = Math.min(Math.max(0, time), endT);
    this.playbackTime.set(target);
    this.syncFrameIndex(target);
  }

  isActiveEvent(time: number): boolean {
    return Math.abs(time - this.currentTime()) <= 2;
  }

  selectChampion(playerId: string): void {
    this.selectedPlayerId.update((current) => (current === playerId ? null : playerId));
  }

  step(delta: number): void {
    this.playing.set(false);
    const list = this.frames();
    const max = Math.max(0, list.length - 1);
    const index = Math.min(max, Math.max(0, this.frameIndex() + delta));
    this.frameIndex.set(index);
    this.playbackTime.set(list[index]?.t ?? 0);
  }

  togglePlay(): void {
    if (this.frameCount() <= 1) {
      return;
    }
    if (this.playing()) {
      this.playing.set(false);
      return;
    }
    const list = this.frames();
    const endT = list[list.length - 1]?.t ?? 0;
    if (this.playbackTime() >= endT - 1e-6) {
      this.frameIndex.set(0);
      this.playbackTime.set(list[0]?.t ?? 0);
    }
    this.playing.set(true);
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed.set(speed);
  }

  private syncFrameIndex(time: number): void {
    const list = this.frames();
    if (list.length === 0) {
      this.frameIndex.set(0);
      return;
    }
    this.frameIndex.set(findFrameFloor(list, time));
  }

  private startTimer(speed: PlaybackSpeed): void {
    this.stopTimer();
    this.lastRafMs = performance.now();
    const tick = (now: number) => {
      const dtSec = Math.min(0.05, Math.max(0, (now - this.lastRafMs) / 1000));
      this.lastRafMs = now;
      const list = this.frames();
      if (list.length === 0) {
        this.playing.set(false);
        return;
      }
      const endT = list[list.length - 1].t;
      const next = this.playbackTime() + dtSec * speed;
      if (next >= endT) {
        this.playbackTime.set(endT);
        this.syncFrameIndex(endT);
        this.playing.set(false);
        return;
      }
      this.playbackTime.set(next);
      this.syncFrameIndex(next);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopTimer(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
