import { SIM_BALANCE } from './balance';
import type { MatchPhaseId, TeamStyleAxes } from './report';

export interface MatchupSwing {
  phase: MatchPhaseId;
  homeDelta: number;
  note: string | null;
}

function axisEdge(home: number, away: number): number {
  return (home - away) * SIM_BALANCE.matchupScale;
}

export function resolveMatchupSwings(home: TeamStyleAxes, away: TeamStyleAxes): MatchupSwing[] {
  const swings: MatchupSwing[] = [];

  const early =
    axisEdge(home.earlyAggression, away.earlyAggression) * 0.55 +
    axisEdge(home.lanePressure, away.lanePressure) * 0.45 -
    axisEdge(home.lateScaling, away.lateScaling) * 0.25;
  swings.push({
    phase: 'early',
    homeDelta: early,
    note:
      Math.abs(early) >= 2.2
        ? early > 0
          ? '主隊前期侵略壓制客隊後期向陣容'
          : '客隊前期侵略壓制主隊後期向陣容'
        : null,
  });

  const mid =
    axisEdge(home.jungleMidSync, away.jungleMidSync) * 0.4 +
    axisEdge(home.resourceControl, away.resourceControl) * 0.45 +
    axisEdge(home.balanced, away.balanced) * 0.15;
  swings.push({
    phase: 'mid',
    homeDelta: mid,
    note:
      Math.abs(mid) >= 2
        ? mid > 0
          ? '主隊中野節奏與資源控制較佳'
          : '客隊中野節奏與資源控制較佳'
        : null,
  });

  const lateTeamfight = axisEdge(home.teamfightExecute, away.teamfightExecute);
  const lateScale = axisEdge(home.lateScaling, away.lateScaling);
  const lateSplit = axisEdge(home.splitPush, away.splitPush);
  const late = lateTeamfight * 0.45 + lateScale * 0.35 + lateSplit * 0.2;
  swings.push({
    phase: 'late',
    homeDelta: late,
    note:
      Math.abs(late) >= 2.2
        ? late > 0
          ? lateSplit > lateTeamfight
            ? '主隊邊線分推條件較優'
            : '主隊後期團戰執行較優'
          : lateSplit < -lateTeamfight
            ? '客隊邊線分推條件較優'
            : '客隊後期團戰執行較優'
        : null,
  });

  const draft =
    axisEdge(home.balanced, away.balanced) * 0.2 +
    axisEdge(home.resourceControl, away.earlyAggression) * 0.15 -
    axisEdge(home.earlyAggression, away.resourceControl) * 0.1;
  swings.push({
    phase: 'draft',
    homeDelta: draft,
    note: null,
  });

  return swings;
}
