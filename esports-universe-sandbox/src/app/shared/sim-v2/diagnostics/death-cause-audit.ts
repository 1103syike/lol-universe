import { simulateV2Match, type SimulateV2Input } from '../engine';
import { dist } from '../map/pathfinding';
import type { ReplayEvent } from '../replay/recorder';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

export interface DeathMatchInput {
  seed: number;
  label: string;
  blue: string[];
  red: string[];
  maxDurationSec?: number;
}

export interface DeathDamageSlice {
  t: number;
  via: string;
  amount: number;
  sourceId?: string;
  sourceLabel: string;
}

export interface DeathRecord {
  matchLabel: string;
  seed: number;
  t: number;
  victimId: string;
  victimLabel: string;
  victimSide: 'blue' | 'red';
  victimRole: string;
  victimChampion: string;
  victimLevel: number;
  killerLabel: string;
  via: string;
  x: number;
  y: number;
  zone: string;
  nearOwnTower: boolean;
  nearEnemyTower: boolean;
  damageTrail: DeathDamageSlice[];
  champDamageShare: number;
  nonChampDamageShare: number;
  decisions: string[];
  engineSmell: string[];
  note: string;
}

export interface DeathMatchReport {
  matchLabel: string;
  seed: number;
  durationSec: number;
  winner: string;
  totalDeaths: number;
  viaCounts: Record<string, number>;
  smellCounts: Record<string, number>;
  deaths: DeathRecord[];
  kdaLines: string[];
}

function roster(side: 'blue' | 'red', bots: string[]) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[index],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function champLabel(champ: ChampionEntity): string {
  return `${champ.side}:${champ.positionLabel}:${champ.championId}`;
}

function findChamp(state: GameState, id: string | undefined): ChampionEntity | null {
  if (!id) {
    return null;
  }
  return state.champions.find((champ) => champ.id === id) ?? null;
}

function mapZone(x: number, y: number): string {
  const riverish = Math.abs(x - y) < 1800;
  if (x < 5200 && y < 5200) {
    return 'blue_base';
  }
  if (x > 9800 && y > 9800) {
    return 'red_base';
  }
  if (riverish && x > 5200 && x < 9800) {
    return 'river';
  }
  if (y > x + 1200) {
    return 'top_side';
  }
  if (x > y + 1200) {
    return 'bot_side';
  }
  return 'mid_side';
}

function nearTower(
  state: GameState,
  side: 'blue' | 'red' | 'either',
  point: { x: number; y: number },
): boolean {
  return state.structures.some((structure) => {
    if (!structure.alive || structure.ad <= 0 || structure.range <= 0) {
      return false;
    }
    if (side !== 'either' && structure.side !== side) {
      return false;
    }
    return dist(structure.position, point) <= structure.range + 120;
  });
}

function sourceLabel(state: GameState, sourceId: string | undefined, via: string): string {
  const champ = findChamp(state, sourceId);
  if (champ) {
    return champLabel(champ);
  }
  if (via === 'tower' || via === 'fountain') {
    return via;
  }
  if (via === 'minion') {
    return 'minion';
  }
  if (via === 'monster' || via === 'camp') {
    return 'monster';
  }
  return sourceId ?? via;
}

function classifySmells(input: {
  via: string;
  champShare: number;
  nonChampShare: number;
  nearEnemyTower: boolean;
  nearOwnTower: boolean;
  trail: DeathDamageSlice[];
  decisions: string[];
  t: number;
  victimRole: string;
}): string[] {
  const smells: string[] = [];
  const { via, champShare, nonChampShare, nearEnemyTower, nearOwnTower, trail, decisions, t } =
    input;
  if (via === 'minion' || (nonChampShare >= 0.55 && trail.some((row) => row.via === 'minion'))) {
    smells.push('minion_execute');
  }
  if (via === 'tower' || trail.some((row) => row.via === 'tower' && row.amount > 80)) {
    smells.push('tower_dive_or_bail_fail');
  }
  if (via === 'fountain') {
    smells.push('fountain_laser');
  }
  if (via === 'monster' || via === 'camp') {
    smells.push('jungle_pve');
  }
  if (nearEnemyTower && champShare < 0.35) {
    smells.push('died_under_enemy_tower_low_champ_damage');
  }
  if (nearOwnTower && via === 'minion') {
    smells.push('died_to_minions_under_own_tower');
  }
  if (t < 480 && via === 'minion') {
    smells.push('early_minion_kill');
  }
  if (
    decisions.some((action) => action === 'farm' || action === 'lane' || action === 'wave_shove') &&
    (via === 'minion' || via === 'tower')
  ) {
    smells.push('laning_action_then_environment_death');
  }
  if (
    decisions.some((action) => action === 'fight' || action === 'trade' || action === 'skirmish') &&
    via === 'tower'
  ) {
    smells.push('fight_into_tower');
  }
  if (champShare >= 0.7 && (via === 'auto' || via.startsWith('Q') || via.length <= 8)) {
    smells.push('fair_champ_kill');
  }
  if (smells.length === 0) {
    smells.push('unclassified');
  }
  return smells;
}

function deathNote(smells: string[], via: string, champShare: number): string {
  if (smells.includes('early_minion_kill') || smells.includes('died_to_minions_under_own_tower')) {
    return '環境傷害（小兵）收尾過強，或對線殘血後沒有拉開／回城。';
  }
  if (smells.includes('tower_dive_or_bail_fail') || smells.includes('fight_into_tower')) {
    return '塔傷參與過高：越塔／撤離判斷或塔仇恨處理可能有問題。';
  }
  if (smells.includes('jungle_pve')) {
    return '野怪／Epic 打死：打野清野或目標點血量管理偏兇。';
  }
  if (smells.includes('fountain_laser')) {
    return '溫泉雷射擊殺：入侵泉水或殘血跑錯位置。';
  }
  if (smells.includes('fair_champ_kill') || champShare >= 0.65) {
    return '以英雄傷害為主的擊殺，比較像對線／團戰結果。';
  }
  if (via === 'minion') {
    return '小兵補刀式擊殺：殘血被兵收，需看是否過深或不敢撤。';
  }
  return `via=${via}，英雄傷害占比 ${(champShare * 100).toFixed(0)}%。`;
}

function damageTrailFor(
  state: GameState,
  events: ReplayEvent[],
  victimId: string,
  deathT: number,
): DeathDamageSlice[] {
  const windowStart = deathT - 6;
  const rows: DeathDamageSlice[] = [];
  for (const event of events) {
    if (event.type !== 'damage' || event.targetId !== victimId) {
      continue;
    }
    if (event.t < windowStart || event.t > deathT + 0.05) {
      continue;
    }
    const via = String((event.payload as { via?: string } | undefined)?.via ?? 'auto');
    rows.push({
      t: event.t,
      via,
      amount: event.amount ?? 0,
      sourceId: event.actorId,
      sourceLabel: sourceLabel(state, event.actorId, via),
    });
  }
  return rows.sort((left, right) => left.t - right.t);
}

function decisionsNear(
  events: ReplayEvent[],
  victimId: string,
  deathT: number,
): string[] {
  const actions: string[] = [];
  for (const event of events) {
    if (event.type !== 'ai_decision' || event.actorId !== victimId) {
      continue;
    }
    if (event.t < deathT - 8 || event.t > deathT) {
      continue;
    }
    const action = String((event.payload as { action?: string } | undefined)?.action ?? '?');
    if (!actions.includes(action)) {
      actions.push(action);
    }
  }
  return actions;
}

export function auditDeathMatch(input: DeathMatchInput): DeathMatchReport {
  const simInput: SimulateV2Input = {
    versionId: 'demo-a',
    seed: input.seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', input.blue),
    red: roster('red', input.red),
    maxDurationSec: input.maxDurationSec ?? 1800,
  };
  const { state, replay } = simulateV2Match(simInput);
  const deaths = replay.events.filter((event) => event.type === 'death');
  const records: DeathRecord[] = [];
  const viaCounts: Record<string, number> = {};
  const smellCounts: Record<string, number> = {};

  for (const event of deaths) {
    const victim = findChamp(state, event.actorId);
    if (!victim) {
      continue;
    }
    const killer = findChamp(state, event.targetId);
    const via = String((event.payload as { via?: string } | undefined)?.via ?? '?');
    viaCounts[via] = (viaCounts[via] ?? 0) + 1;
    const point = { x: event.x ?? victim.position.x, y: event.y ?? victim.position.y };
    const trail = damageTrailFor(state, replay.events, victim.id, event.t);
    const totalDmg = trail.reduce((sum, row) => sum + row.amount, 0) || 1;
    const champDmg = trail
      .filter((row) => findChamp(state, row.sourceId))
      .reduce((sum, row) => sum + row.amount, 0);
    const champShare = champDmg / totalDmg;
    const nonChampShare = 1 - champShare;
    const decisions = decisionsNear(replay.events, victim.id, event.t);
    const smells = classifySmells({
      via,
      champShare,
      nonChampShare,
      nearEnemyTower: nearTower(state, victim.side === 'blue' ? 'red' : 'blue', point),
      nearOwnTower: nearTower(state, victim.side, point),
      trail,
      decisions,
      t: event.t,
      victimRole: victim.positionLabel,
    });
    for (const smell of smells) {
      smellCounts[smell] = (smellCounts[smell] ?? 0) + 1;
    }
    const snapshotVictim = [...replay.snapshots]
      .reverse()
      .find((snap) => snap.t <= event.t)
      ?.champions.find((champ) => champ.id === victim.id);
    records.push({
      matchLabel: input.label,
      seed: input.seed,
      t: event.t,
      victimId: victim.id,
      victimLabel: champLabel(victim),
      victimSide: victim.side,
      victimRole: victim.positionLabel,
      victimChampion: victim.championId,
      victimLevel: snapshotVictim?.level ?? victim.level,
      killerLabel: killer
        ? champLabel(killer)
        : via === 'tower'
          ? `tower:${String((event.payload as { structureSide?: string }).structureSide ?? '?')}`
          : via,
      via,
      x: point.x,
      y: point.y,
      zone: mapZone(point.x, point.y),
      nearOwnTower: nearTower(state, victim.side, point),
      nearEnemyTower: nearTower(state, victim.side === 'blue' ? 'red' : 'blue', point),
      damageTrail: trail,
      champDamageShare: champShare,
      nonChampDamageShare: nonChampShare,
      decisions,
      engineSmell: smells,
      note: deathNote(smells, via, champShare),
    });
  }

  return {
    matchLabel: input.label,
    seed: input.seed,
    durationSec: state.scheduler.time,
    winner: state.winnerTeamId ?? 'none',
    totalDeaths: records.length,
    viaCounts,
    smellCounts,
    deaths: records,
    kdaLines: state.champions.map(
      (champ) =>
        `${champLabel(champ)} ${champ.kills}/${champ.deaths}/${champ.assists} lv${champ.level} gold=${Math.round(champ.earnedGold)}`,
    ),
  };
}

export const DEFAULT_DEATH_AUDIT_MATCHES: DeathMatchInput[] = [
  {
    seed: 1000,
    label: 'M1 classic',
    blue: ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh'],
    red: ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona'],
  },
  {
    seed: 1100,
    label: 'M2 engage bot',
    blue: ['Camille', 'Graves', 'Orianna', 'Jinx', 'Nautilus'],
    red: ['Darius', 'LeeSin', 'Annie', 'Ezreal', 'Lux'],
  },
  {
    seed: 1200,
    label: 'M3 assassin mid',
    blue: ['Renekton', 'Viego', 'Zed', 'Ashe', 'Thresh'],
    red: ['Jayce', 'Graves', 'Ahri', 'Jhin', 'Leona'],
  },
  {
    seed: 42,
    label: 'M4 poke',
    blue: ['Jayce', 'LeeSin', 'Syndra', 'Ezreal', 'Lux'],
    red: ['Aatrox', 'Viego', 'Orianna', 'Jinx', 'Nautilus'],
  },
  {
    seed: 77,
    label: 'M5 skirmish',
    blue: ['Darius', 'LeeSin', 'Annie', 'Jhin', 'Thresh'],
    red: ['Camille', 'Graves', 'Ahri', 'Ashe', 'Leona'],
  },
];

export function formatDeathAuditReport(reports: DeathMatchReport[]): string {
  const lines: string[] = [];
  lines.push('# Death Cause Audit');
  lines.push('');
  lines.push(`Matches: ${reports.length}`);
  const allDeaths = reports.flatMap((report) => report.deaths);
  lines.push(`Total deaths: ${allDeaths.length}`);
  lines.push('');

  const viaAll: Record<string, number> = {};
  const smellAll: Record<string, number> = {};
  for (const death of allDeaths) {
    viaAll[death.via] = (viaAll[death.via] ?? 0) + 1;
    for (const smell of death.engineSmell) {
      smellAll[smell] = (smellAll[smell] ?? 0) + 1;
    }
  }
  lines.push('## Aggregate via');
  for (const [via, count] of Object.entries(viaAll).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${via}: ${count} (${((count / Math.max(1, allDeaths.length)) * 100).toFixed(1)}%)`);
  }
  lines.push('');
  lines.push('## Aggregate engine smells');
  for (const [smell, count] of Object.entries(smellAll).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${smell}: ${count}`);
  }
  lines.push('');

  for (const report of reports) {
    lines.push(`## ${report.matchLabel} (seed ${report.seed})`);
    lines.push(
      `duration=${report.durationSec.toFixed(0)}s winner=${report.winner} deaths=${report.totalDeaths}`,
    );
    lines.push('KDA:');
    for (const line of report.kdaLines) {
      lines.push(`- ${line}`);
    }
    lines.push('');
    lines.push('Deaths:');
    for (const death of report.deaths) {
      const mm = Math.floor(death.t / 60);
      const ss = String(Math.floor(death.t % 60)).padStart(2, '0');
      lines.push(
        `- ${mm}:${ss} ${death.victimLabel} lv${death.victimLevel} <- ${death.killerLabel} via=${death.via} zone=${death.zone} ownTower=${death.nearOwnTower} enemyTower=${death.nearEnemyTower}`,
      );
      lines.push(
        `  champDmg=${(death.champDamageShare * 100).toFixed(0)}% decisions=[${death.decisions.join(',')}] smells=[${death.engineSmell.join(',')}]`,
      );
      lines.push(`  note: ${death.note}`);
      if (death.damageTrail.length > 0) {
        const compact = death.damageTrail
          .slice(-8)
          .map(
            (row) =>
              `${row.sourceLabel}/${row.via}:${Math.round(row.amount)}@${row.t.toFixed(1)}`,
          )
          .join(' | ');
        lines.push(`  trail: ${compact}`);
      }
    }
    lines.push('');
  }

  lines.push('## Engine design concerns (from sample)');
  const concernOrder = [
    'minion_execute',
    'early_minion_kill',
    'died_to_minions_under_own_tower',
    'laning_action_then_environment_death',
    'tower_dive_or_bail_fail',
    'fight_into_tower',
    'died_under_enemy_tower_low_champ_damage',
    'jungle_pve',
    'fountain_laser',
  ];
  for (const smell of concernOrder) {
    const count = smellAll[smell] ?? 0;
    if (count <= 0) {
      continue;
    }
    lines.push(`- **${smell}** x${count}`);
  }
  return lines.join('\n');
}

export function runDeathCauseAudit(
  matches: DeathMatchInput[] = DEFAULT_DEATH_AUDIT_MATCHES,
): { reports: DeathMatchReport[]; markdown: string } {
  const reports = matches.map((match) => auditDeathMatch(match));
  return { reports, markdown: formatDeathAuditReport(reports) };
}
