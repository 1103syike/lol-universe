export type RoleMetricCurve = {
  min: number;
  avg: number;
  max: number;
};

export type RoleCurveBundle = {
  gpm: RoleMetricCurve;
  csm: RoleMetricCurve;
  dpm: RoleMetricCurve;
  dtpm: RoleMetricCurve;
};

export const LCK_ROLE_CURVE = {
  TOP: {
    gpm: { min: 374, avg: 392, max: 406 },
    csm: { min: 8.2, avg: 8.5, max: 9.2 },
    dpm: { min: 554, avg: 629, max: 673 },
    dtpm: { min: 550, avg: 780, max: 1100 },
  },
  JUNGLE: {
    gpm: { min: 377, avg: 394, max: 418 },
    csm: { min: 6.4, avg: 7.0, max: 7.2 },
    dpm: { min: 410, avg: 467, max: 545 },
    dtpm: { min: 500, avg: 700, max: 950 },
  },
  MID: {
    gpm: { min: 385, avg: 411, max: 448 },
    csm: { min: 8.6, avg: 9.1, max: 9.7 },
    dpm: { min: 548, avg: 673, max: 845 },
    dtpm: { min: 450, avg: 650, max: 900 },
  },
  BOT: {
    gpm: { min: 460, avg: 494, max: 511 },
    csm: { min: 9.7, avg: 10.2, max: 10.7 },
    dpm: { min: 711, avg: 790, max: 831 },
    dtpm: { min: 350, avg: 520, max: 750 },
  },
  SUPPORT: {
    gpm: { min: 253, avg: 268, max: 288 },
    csm: { min: 0.9, avg: 1.1, max: 1.2 },
    dpm: { min: 217, avg: 245, max: 271 },
    dtpm: { min: 400, avg: 600, max: 850 },
  },
} as const satisfies Record<string, RoleCurveBundle>;

export const LCK_CURVE_SOURCE =
  'LCK 2026 Liquipedia player season averages (CSPM/GPM/DPM); DTPM estimated from typical pro Oracle/Gol.gg role bands';

export const SIM_MEAN_TOLERANCE = {
  gpm: 0.35,
  csm: 0.42,
  dpm: 0.65,
  dtpm: 0.55,
} as const;

export function meanNearLck(actual: number, curve: RoleMetricCurve, tolerance: number): boolean {
  const low = curve.avg * (1 - tolerance);
  const high = curve.avg * (1 + tolerance);
  return actual >= low && actual <= high;
}

export function extremeWithinBand(
  minValue: number,
  maxValue: number,
  curve: RoleMetricCurve,
  widen = 0.35,
): boolean {
  const floor = curve.min * (1 - widen);
  const ceiling = curve.max * (1 + widen);
  return minValue >= floor && maxValue <= ceiling;
}
