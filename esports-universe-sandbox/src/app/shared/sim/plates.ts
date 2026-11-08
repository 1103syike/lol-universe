import { SIM_BALANCE } from './balance';

export function plateGoldAt(t: number): number {
  const factor = Math.pow(0.5, Math.max(0, t) / SIM_BALANCE.plateDecayHalfLifeSec);
  return Math.max(
    SIM_BALANCE.plateGoldFloor,
    Math.round(SIM_BALANCE.plateGold * factor),
  );
}
