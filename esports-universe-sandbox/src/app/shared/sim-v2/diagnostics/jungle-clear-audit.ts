import { createMatch, type SimulateV2Input } from '../engine';
import { attackCamp, castJungleClearAbilities } from '../jungle/jungle-system';
import type { ChampionEntity, MonsterEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import { dist } from '../map/pathfinding';

const REAL_CAMP_CLEAR_SEC: Record<string, { min: number; max: number; label: string }> = {
  blue_buff: { min: 12, max: 18, label: 'Blue' },
  red_buff: { min: 12, max: 18, label: 'Red' },
  gromp: { min: 8, max: 12, label: 'Gromp' },
  wolves: { min: 8, max: 14, label: 'Wolves' },
  raptors: { min: 10, max: 16, label: 'Raptors' },
  krugs: { min: 18, max: 28, label: 'Krugs' },
  scuttle_top: { min: 6, max: 12, label: 'Scuttle' },
};

const FULL_CLEAR_CLOCK = { min: 150, max: 190 };
const WORLD_DT = 0.5;

export interface CampClearRow {
  campId: string;
  label: string;
  clearSec: number;
  expectedMin: number;
  expectedMax: number;
  status: 'fast' | 'ok' | 'slow';
  unitHits: number;
  totalHp: number;
  gold: number;
  cs: number;
}

export interface JungleClearAudit {
  rows: CampClearRow[];
  fullClearCombatSec: number;
  estimatedClockSec: number;
  junglerAd: number;
  junglerAs: number;
  championId: string;
  note: string;
}

function roster(side: 'blue' | 'red', junglerId: string) {
  const prefix = side;
  return [
    {
      playerId: `${prefix}_top`,
      gamertag: `${prefix}_top`,
      position: 'TOP' as const,
      championId: 'Garen',
      laning: 70,
      mechanics: 65,
      teamfighting: 60,
      gameSense: 65,
      consistency: 70,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_jg`,
      gamertag: `${prefix}_jg`,
      position: 'JUNGLE' as const,
      championId: junglerId,
      laning: 55,
      mechanics: 80,
      teamfighting: 70,
      gameSense: 75,
      consistency: 60,
      adaptability: 70,
    },
    {
      playerId: `${prefix}_mid`,
      gamertag: `${prefix}_mid`,
      position: 'MID' as const,
      championId: 'Annie',
      laning: 70,
      mechanics: 70,
      teamfighting: 75,
      gameSense: 70,
      consistency: 65,
      adaptability: 65,
    },
    {
      playerId: `${prefix}_bot`,
      gamertag: `${prefix}_bot`,
      position: 'BOT' as const,
      championId: 'Ashe',
      laning: 70,
      mechanics: 72,
      teamfighting: 70,
      gameSense: 65,
      consistency: 65,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_sup`,
      gamertag: `${prefix}_sup`,
      position: 'SUPPORT' as const,
      championId: 'Leona',
      laning: 55,
      mechanics: 60,
      teamfighting: 70,
      gameSense: 75,
      consistency: 70,
      adaptability: 65,
    },
  ];
}

function input(seed: number, junglerId: string): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', junglerId),
    red: roster('red', junglerId),
    maxDurationSec: 600,
  };
}

function campAlive(state: GameState, campId: string): MonsterEntity[] {
  return state.monsters.filter((monster) => monster.alive && monster.campId === campId);
}

function focusTarget(
  state: GameState,
  campId: string,
  jungler: ChampionEntity,
): MonsterEntity | null {
  const alive = campAlive(state, campId).filter(
    (monster) => monster.spawnProtectUntil <= state.scheduler.time,
  );
  if (alive.length === 0) {
    return null;
  }
  return [...alive].sort((left, right) => {
    const sizeRank = (size: MonsterEntity['size']) =>
      size === 'large' ? 0 : size === 'medium' ? 1 : 2;
    const sizeDiff = sizeRank(left.size) - sizeRank(right.size);
    if (sizeDiff !== 0) {
      return sizeDiff;
    }
    return dist(jungler.position, left.position) - dist(jungler.position, right.position);
  })[0];
}

function stepToward(jungler: ChampionEntity, target: MonsterEntity, step = 180): void {
  const dx = target.position.x - jungler.position.x;
  const dy = target.position.y - jungler.position.y;
  const len = Math.hypot(dx, dy);
  if (len <= jungler.attackRange + 20) {
    return;
  }
  const take = Math.min(step, Math.max(0, len - jungler.attackRange));
  jungler.position = {
    x: jungler.position.x + (dx / len) * take,
    y: jungler.position.y + (dy / len) * take,
  };
}

function clearOneCamp(
  state: GameState,
  jungler: ChampionEntity,
  campId: string,
): { clearSec: number; unitHits: number; totalHp: number; gold: number; cs: number } {
  const startCs = jungler.cs;
  const startGold = jungler.gold;
  const units = campAlive(state, campId);
  let totalHp = units.reduce((sum, unit) => sum + unit.hp, 0);
  let unitHits = 0;
  let clearSec = 0;
  const hardCap = 180;
  const origin = units[0] ? { ...units[0].position } : { ...jungler.position };
  jungler.position = { ...origin };

  while (campAlive(state, campId).length > 0 && clearSec < hardCap) {
    const target = focusTarget(state, campId, jungler);
    if (!target) {
      clearSec += WORLD_DT;
      state.scheduler.runUntil(state.scheduler.time + WORLD_DT);
      continue;
    }
    if (target.maxHp === target.hp && target.unitKind === 'mini_krug') {
      totalHp += target.maxHp;
    }
    stepToward(jungler, target);
    const beforeHp = target.hp;
    castJungleClearAbilities(state, jungler, target);
    const hit = attackCamp(state, jungler, target);
    if (target.hp < beforeHp || hit) {
      unitHits += 1;
    }
    clearSec += WORLD_DT;
    state.scheduler.runUntil(state.scheduler.time + WORLD_DT);
  }

  return {
    clearSec: Number(clearSec.toFixed(2)),
    unitHits,
    totalHp,
    gold: Number((jungler.gold - startGold).toFixed(1)),
    cs: Number((jungler.cs - startCs).toFixed(2)),
  };
}

function prepareJunglerForClearAudit(jungler: ChampionEntity): void {
  for (const spell of jungler.summonerSpells) {
    spell.cooldownUntil = 0;
  }
  for (const ability of jungler.abilities) {
    ability.cooldownUntil = 0;
  }
  jungler.nextAttackAt = 0;
  jungler.nextSmiteAt = 0;
}

export function auditJungleClearTimes(junglerId = 'LeeSin'): JungleClearAudit {
  const { state } = createMatch(input(91001, junglerId));
  state.scheduler.runUntil(95);
  const jungler = state.champions.find(
    (champ) => champ.side === 'blue' && champ.positionLabel === 'JUNGLE',
  );
  if (!jungler) {
    throw new Error('missing jungler');
  }
  const order = ['blue_buff', 'gromp', 'wolves', 'raptors', 'red_buff', 'krugs'] as const;
  const rows: CampClearRow[] = [];
  let fullClearCombatSec = 0;

  for (const campId of order) {
    const expected = REAL_CAMP_CLEAR_SEC[campId];
    if (campAlive(state, campId).length === 0) {
      continue;
    }
    prepareJunglerForClearAudit(jungler);
    const measured = clearOneCamp(state, jungler, campId);
    fullClearCombatSec += measured.clearSec;
    let status: CampClearRow['status'] = 'ok';
    if (measured.clearSec < expected.min * 0.75) {
      status = 'fast';
    } else if (measured.clearSec > expected.max * 1.25) {
      status = 'slow';
    }
    rows.push({
      campId,
      label: expected.label,
      clearSec: measured.clearSec,
      expectedMin: expected.min,
      expectedMax: expected.max,
      status,
      unitHits: measured.unitHits,
      totalHp: measured.totalHp,
      gold: measured.gold,
      cs: measured.cs,
    });
  }

  {
    const scuttleState = createMatch(input(91002, junglerId)).state;
    scuttleState.scheduler.runUntil(195);
    const freshJungler = scuttleState.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'JUNGLE',
    );
    const expected = REAL_CAMP_CLEAR_SEC['scuttle_top'];
    if (freshJungler && campAlive(scuttleState, 'scuttle_top').length > 0) {
      prepareJunglerForClearAudit(freshJungler);
      const measured = clearOneCamp(scuttleState, freshJungler, 'scuttle_top');
      let status: CampClearRow['status'] = 'ok';
      if (measured.clearSec < expected.min * 0.75) {
        status = 'fast';
      } else if (measured.clearSec > expected.max * 1.25) {
        status = 'slow';
      }
      rows.push({
        campId: 'scuttle_top',
        label: expected.label,
        clearSec: measured.clearSec,
        expectedMin: expected.min,
        expectedMax: expected.max,
        status,
        unitHits: measured.unitHits,
        totalHp: measured.totalHp,
        gold: measured.gold,
        cs: measured.cs,
      });
    }
  }

  const walkBufferSec = 35;
  const estimatedClockSec = 55 + fullClearCombatSec + walkBufferSec;

  return {
    rows,
    fullClearCombatSec: Number(fullClearCombatSec.toFixed(2)),
    estimatedClockSec: Number(estimatedClockSec.toFixed(1)),
    junglerAd: jungler.ad,
    junglerAs: jungler.attackSpeed,
    championId: jungler.championId,
    note:
      estimatedClockSec < FULL_CLEAR_CLOCK.min
        ? `預估時鐘 ${formatClock(estimatedClockSec)} 偏快（目標約 2:30–3:10）`
        : estimatedClockSec > FULL_CLEAR_CLOCK.max
          ? `預估時鐘 ${formatClock(estimatedClockSec)} 偏慢（目標約 2:30–3:10）`
          : `預估時鐘 ${formatClock(estimatedClockSec)} 落在合理區間`,
  };
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function formatJungleClearAudit(audit: JungleClearAudit): string {
  const lines = [
    `${audit.championId} AD=${audit.junglerAd.toFixed(1)} AS=${audit.junglerAs}`,
    'camp | clear | expected | status | hits | hp | gold | cs',
  ];
  for (const row of audit.rows) {
    lines.push(
      `${row.label.padEnd(8)} | ${row.clearSec.toFixed(1).padStart(4)}s | ${row.expectedMin}-${row.expectedMax}s | ${row.status.padEnd(4)} | ${String(row.unitHits).padStart(3)} | ${String(Math.round(row.totalHp)).padStart(5)} | ${String(row.gold).padStart(4)} | ${row.cs}`,
    );
  }
  lines.push(
    `combatSum=${audit.fullClearCombatSec}s  estClock=${formatClock(audit.estimatedClockSec)}  ${audit.note}`,
  );
  return lines.join('\n');
}
