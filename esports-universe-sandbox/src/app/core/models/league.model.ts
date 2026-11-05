export const LEAGUE_TIERS = ['TCS', 'TCL', 'RL', 'EA'] as const;

export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export const LEAGUE_TIER_LABELS: Record<LeagueTier, string> = {
  TCS: 'TCS（甲級）',
  TCL: 'TCL（乙級）',
  RL: 'Reserve League',
  EA: 'Esports Academy',
};
