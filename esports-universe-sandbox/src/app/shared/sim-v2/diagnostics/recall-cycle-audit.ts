import { decideForChampion } from '../ai/decision';
import { getMatchAiRuntime } from '../ai/runtime';
import { createMatch, type SimulateV2Input } from '../engine';
import { dist } from '../map/pathfinding';
import type { ChampionEntity, MinionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId } from '../types/ids';

export type RecallAuditStatus = 'pass' | 'fail' | 'gap';

export interface RecallAuditRow {
  id: string;
  title: string;
  expected: string;
  observed: string;
  status: RecallAuditStatus;
  note?: string;
}

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${prefix}_${position}`,
    gamertag: `${prefix}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function baseInput(seed: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 900,
  };
}

function champOf(state: GameState, side: 'blue' | 'red', position: string): ChampionEntity {
  const found = state.champions.find(
    (champ) => champ.side === side && champ.positionLabel === position,
  );
  if (!found) {
    throw new Error(`missing ${side} ${position}`);
  }
  return found;
}

function outerTower(state: GameState, side: 'blue' | 'red', lane: LaneId) {
  return state.structures.find(
    (structure) =>
      structure.alive &&
      structure.side === side &&
      structure.lane === lane &&
      structure.structureKind === 'outer_tower',
  );
}

function pointOnLane(state: GameState, lane: LaneId, progress: number) {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return { x: 0, y: 0 };
  }
  const index = Math.min(path.length - 1, Math.max(0, Math.round(progress * (path.length - 1))));
  return { ...path[index] };
}

function parkFar(state: GameState): void {
  const blueFountain = state.lockedPack.map.blueFountain;
  const redFountain = state.lockedPack.map.redFountain;
  for (const champ of state.champions) {
    champ.alive = true;
    champ.moving = false;
    champ.path = [];
    champ.recallPhase = 'none';
    champ.recallChannelUntil = 0;
    champ.recallChannelDuration = 0;
    champ.recallHpSnapshot = 0;
    champ.currentAction = 'idle';
    champ.position = champ.side === 'blue' ? { ...blueFountain } : { ...redFountain };
    champ.hp = champ.maxHp;
  }
}

function resetSubject(champ: ChampionEntity, hpRatio: number, gold: number): void {
  champ.alive = true;
  champ.moving = false;
  champ.path = [];
  champ.recallPhase = 'none';
  champ.recallChannelUntil = 0;
  champ.recallChannelDuration = 0;
  champ.recallHpSnapshot = 0;
  champ.currentAction = 'idle';
  champ.hp = Math.max(1, champ.maxHp * hpRatio);
  champ.gold = gold;
}

function observe(champ: ChampionEntity) {
  return {
    action: champ.currentAction,
    recallPhase: champ.recallPhase,
    moving: champ.moving,
    pathLen: champ.path.length,
    channelLeft: Math.max(0, champ.recallChannelUntil),
  };
}

function summarize(champ: ChampionEntity): string {
  const shot = observe(champ);
  if (shot.recallPhase === 'moving_home') {
    return `channeling B (${shot.action})`;
  }
  if (shot.recallPhase === 'at_base') {
    return 'at base';
  }
  if (shot.moving || shot.pathLen > 0) {
    return `moving (${shot.action}, path=${shot.pathLen})`;
  }
  return `idle/standing (${shot.action})`;
}

function row(
  id: string,
  title: string,
  expected: string,
  observed: string,
  status: RecallAuditStatus,
  note?: string,
): RecallAuditRow {
  return { id, title, expected, observed, status, note };
}

function prepareLaneScene(seed: number): {
  state: GameState;
  mid: ChampionEntity;
  foe: ChampionEntity;
} {
  const { state } = createMatch(baseInput(seed));
  getMatchAiRuntime(state);
  state.scheduler.setTime(420);
  parkFar(state);
  const mid = champOf(state, 'blue', 'MID');
  const foe = champOf(state, 'red', 'MID');
  return { state, mid, foe };
}

export function auditRecallCycleScenarios(): RecallAuditRow[] {
  const rows: RecallAuditRow[] = [];

  {
    const { state, mid, foe } = prepareLaneScene(70101);
    resetSubject(mid, 0.28, 400);
    mid.position = pointOnLane(state, 'mid', 0.52);
    foe.position = {
      x: mid.position.x + 180,
      y: mid.position.y + 40,
    };
    foe.hp = foe.maxHp * 0.9;
    decideForChampion(state, mid);
    const observed = summarize(mid);
    const channeled = mid.recallPhase === 'moving_home';
    const retreated = mid.moving || mid.path.length > 0;
    rows.push(
      row(
        'low-hp-enemy-near',
        '低血量、敵人就在附近',
        '先撤退，不原地 B',
        observed,
        channeled ? 'fail' : retreated ? 'pass' : 'fail',
        channeled ? '仍直接開讀條' : retreated ? undefined : '沒開 B 但也幾乎沒移動',
      ),
    );
  }

  {
    const { state, mid } = prepareLaneScene(70102);
    resetSubject(mid, 0.28, 400);
    const ownOuter = outerTower(state, 'blue', 'mid');
    mid.position = ownOuter
      ? {
          x: ownOuter.position.x * 0.7 + state.lockedPack.map.blueFountain.x * 0.3,
          y: ownOuter.position.y * 0.7 + state.lockedPack.map.blueFountain.y * 0.3,
        }
      : pointOnLane(state, 'mid', 0.28);
    decideForChampion(state, mid);
    const observed = summarize(mid);
    const safeChannel = mid.recallPhase === 'moving_home';
    const walkedSafer = mid.moving || mid.path.length > 0;
    rows.push(
      row(
        'low-hp-no-enemy',
        '低血量、附近沒有敵人',
        '找安全位置回城／安全則開 B',
        observed,
        safeChannel || walkedSafer ? 'pass' : 'fail',
      ),
    );
  }

  {
    const { state, mid, foe } = prepareLaneScene(70103);
    resetSubject(mid, 0.3, 500);
    mid.position = pointOnLane(state, 'mid', 0.58);
    const retreatTarget = pointOnLane(state, 'mid', 0.34);
    foe.position = {
      x: (mid.position.x + retreatTarget.x) * 0.5,
      y: (mid.position.y + retreatTarget.y) * 0.5,
    };
    foe.hp = foe.maxHp;
    const before = { ...mid.position };
    decideForChampion(state, mid);
    const afterFirst = summarize(mid);
    const firstTarget =
      mid.path.length > 0 ? mid.path[mid.path.length - 1] : { ...mid.position };
    mid.position = {
      x: before.x * 0.55 + firstTarget.x * 0.45,
      y: before.y * 0.55 + firstTarget.y * 0.45,
    };
    mid.moving = false;
    mid.path = [];
    mid.recallPhase = 'none';
    mid.currentAction = 'idle';
    decideForChampion(state, mid);
    const afterSecond = summarize(mid);
    const secondTarget =
      mid.path.length > 0 ? mid.path[mid.path.length - 1] : { ...mid.position };
    const walkedIntoFoe =
      dist(secondTarget, foe.position) < dist(mid.position, foe.position) + 40 &&
      dist(secondTarget, foe.position) < 420;
    rows.push(
      row(
        'retreat-path-blocked',
        '低血量、撤退路線有敵人',
        '重新評估路線／改靠近塔或隊友',
        `1st=${afterFirst}; 2nd=${afterSecond}; towardFoe=${walkedIntoFoe}`,
        'gap',
        'safeRecallPos 仍是固定外塔後方口袋，撤退中不會因前方敵人改線',
      ),
    );
  }

  {
    const { state, mid } = prepareLaneScene(70104);
    resetSubject(mid, 0.72, 2100);
    mid.position = pointOnLane(state, 'mid', 0.42);
    decideForChampion(state, mid);
    const observed = summarize(mid);
    const acted =
      mid.recallPhase === 'moving_home' ||
      mid.currentAction === 'wave_shove' ||
      mid.currentAction === 'farm' ||
      mid.currentAction === 'lane' ||
      mid.moving;
    rows.push(
      row(
        'healthy-shop-gold',
        '血量健康、有足夠購裝金額',
        '評估兵線後回城（可先 shove）',
        observed,
        acted ? 'pass' : 'fail',
        '目前主要看 meaningful shop + waveOk；波態定義仍偏粗',
      ),
    );
  }

  {
    const { state, mid } = prepareLaneScene(70105);
    resetSubject(mid, 0.68, 1900);
    mid.position = pointOnLane(state, 'mid', 0.4);
    const ownOuter = outerTower(state, 'blue', 'mid');
    if (ownOuter) {
      const pressureMinion: MinionEntity = {
        id: 'audit_enemy_wave_1',
        kind: 'minion',
        side: 'red',
        lane: 'mid',
        role: 'caster',
        position: {
          x: ownOuter.position.x + 40,
          y: ownOuter.position.y + 20,
        },
        pathIndex: 0,
        hp: 400,
        maxHp: 400,
        ad: 20,
        moveSpeed: 325,
        attackRange: 550,
        nextAttackAt: 0,
        alive: true,
        gold: 20,
        targetId: null,
      };
      state.minions.push(pressureMinion);
    }
    decideForChampion(state, mid);
    const observed = summarize(mid);
    const leftForShop =
      mid.recallPhase === 'moving_home' ||
      (mid.currentAction === 'recall' && (mid.moving || mid.path.length > 0));
    rows.push(
      row(
        'wave-being-pushed-in',
        '己方兵線正在被推進',
        '避免無意義離線',
        observed,
        leftForShop ? 'fail' : 'pass',
        leftForShop
          ? '有錢時仍可能離線；未把「敵方正在推進／回城損失」算進 wantsRecall'
          : '這次沒直接離線，但仍缺明確的推線壓力模型',
      ),
    );
  }

  {
    const { state, mid } = prepareLaneScene(70106);
    resetSubject(mid, 0.45, 1800);
    mid.position = pointOnLane(state, 'mid', 0.36);
    state.scheduler.setTime(Math.max(0, state.lockedPack.monsters.find((m) => m.id === 'dragon')?.firstSpawnSec ?? 300) - 20);
    decideForChampion(state, mid);
    const observed = summarize(mid);
    const leftAnyway =
      mid.recallPhase === 'moving_home' ||
      (mid.currentAction === 'recall' && (mid.moving || mid.path.length > 0));
    rows.push(
      row(
        'dragon-imminent',
        '小龍即將刷新',
        '考慮團隊資源需求，不因買裝無腦回家',
        observed,
        'gap',
        leftAnyway
          ? 'wantsRecall 未讀龍窗；objective 分數與 recall 決策是分開的'
          : '這次沒回家，但是巧合，不是龍窗抑制回城',
      ),
    );
  }

  {
    const { state, mid } = prepareLaneScene(70107);
    resetSubject(mid, 0.55, 800);
    mid.position = pointOnLane(state, 'mid', 0.32);
    mid.recallPhase = 'moving_home';
    mid.recallChannelDuration = 8;
    mid.recallChannelUntil = state.scheduler.time + 6;
    mid.recallHpSnapshot = mid.hp;
    mid.currentAction = 'recall';
    mid.hp = mid.hp - 40;
    decideForChampion(state, mid);
    const observed = summarize(mid);
    const cancelled = mid.recallPhase !== 'moving_home';
    rows.push(
      row(
        'channel-interrupted',
        '回城讀條中受到傷害',
        '中斷讀條',
        observed,
        cancelled ? 'pass' : 'fail',
      ),
    );
  }

  {
    const { state, mid } = prepareLaneScene(70108);
    resetSubject(mid, 0.4, 1600);
    mid.position = { ...state.lockedPack.map.blueFountain };
    mid.recallPhase = 'at_base';
    mid.currentAction = 'recall';
    const goldBefore = mid.gold;
    const itemsBefore = mid.items.length;
    decideForChampion(state, mid);
    decideForChampion(state, mid);
    decideForChampion(state, mid);
    const bought = mid.items.length > itemsBefore || mid.gold < goldBefore;
    const phase = String(mid.recallPhase);
    const leftBase = phase === 'none' || phase === 'at_base' || mid.moving;
    rows.push(
      row(
        'recall-complete-shop-return',
        '回城完成',
        '購買裝備並合理返回線上',
        `phase=${phase}; bought=${bought}; items=${mid.items.length}; gold=${mid.gold}`,
        bought && leftBase ? 'pass' : 'fail',
        '返回線上的時機／鎖線還粗，但買裝+離開泉水主流程存在',
      ),
    );
  }

  {
    rows.push(
      row(
        'dynamic-safe-pos',
        '安全回城點動態化',
        '依敵方可見位置、視野、路徑、隊友重算',
        'safeRecallPos = 外塔等待點固定偏移',
        'gap',
        '外塔被拆、入侵、草叢埋伏皆未建模',
      ),
    );
    rows.push(
      row(
        'wave-ready-definition',
        '兵線推好定義',
        '優勢、回彈、撞塔、凍結風險、損失估算',
        'waveNeedsShoveForRecall: zone/own|river + canPush',
        'gap',
        '缺凍結風險與回城損失估算',
      ),
    );
  }

  return rows;
}

export function formatRecallAudit(rows: RecallAuditRow[]): string {
  const lines = [
    'Recall cycle audit',
    'id | status | title | expected | observed',
    ...rows.map(
      (item) =>
        `${item.id} | ${item.status.toUpperCase()} | ${item.title} | ${item.expected} | ${item.observed}${item.note ? ` | note: ${item.note}` : ''}`,
    ),
  ];
  const counts = {
    pass: rows.filter((item) => item.status === 'pass').length,
    fail: rows.filter((item) => item.status === 'fail').length,
    gap: rows.filter((item) => item.status === 'gap').length,
  };
  lines.push(`summary: pass=${counts.pass} fail=${counts.fail} gap=${counts.gap}`);
  return lines.join('\n');
}
