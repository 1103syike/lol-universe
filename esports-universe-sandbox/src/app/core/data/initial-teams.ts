import type { LeagueTier } from '../models/league.model';
import { defaultTeamLogoUrl } from '../../shared/utils/team-logo';

export interface InitialTeamSeed {
  abbreviation: string;
  name: string;
  leagueTier: LeagueTier;
  logoUrl: string;
}

export const DEFAULT_SALARY_CAP = 100_000_000;

const SEED_ROWS: Array<Omit<InitialTeamSeed, 'logoUrl'>> = [
  { abbreviation: 'GT', name: 'Pegatron Glitter Tigers', leagueTier: 'TCS' },
  { abbreviation: 'DNL', name: 'DN Luna', leagueTier: 'TCS' },
  { abbreviation: 'FIR', name: 'FirstBank Liceria', leagueTier: 'TCS' },
  { abbreviation: 'MSB', name: 'MSI Blue Dragon', leagueTier: 'TCS' },
  { abbreviation: 'UNI', name: 'Uni Lions', leagueTier: 'TCS' },
  { abbreviation: 'FG', name: 'Fubon Guardians', leagueTier: 'TCS' },
  { abbreviation: 'LUX', name: 'STARLUX Esports', leagueTier: 'TCS' },
  { abbreviation: 'RM', name: 'Rakuten Monkeys', leagueTier: 'TCS' },
  { abbreviation: 'DRG', name: 'Dark Royal Gaming', leagueTier: 'TCS' },
  { abbreviation: 'DEA', name: 'CTBC DEA', leagueTier: 'TCS' },
  { abbreviation: 'NOVA MS', name: 'NOVA MS', leagueTier: 'TCL' },
  { abbreviation: 'BMG', name: 'Ban Mei Gaming', leagueTier: 'TCL' },
  { abbreviation: 'FET', name: 'FarEasTone Giants', leagueTier: 'TCL' },
  { abbreviation: 'OCE', name: 'Ocean Rovers', leagueTier: 'TCL' },
  { abbreviation: 'ESB', name: 'ESUN Bear', leagueTier: 'TCL' },
  { abbreviation: 'ONE', name: 'ONE Team', leagueTier: 'TCL' },
  { abbreviation: 'EVG', name: 'EVA Vanguard', leagueTier: 'TCL' },
  { abbreviation: 'ES', name: 'Eagle Spirits', leagueTier: 'TCL' },
  { abbreviation: 'DCG', name: 'Deep Cross Gaming', leagueTier: 'TCL' },
  { abbreviation: 'ANK', name: 'ANK Gaming', leagueTier: 'TCL' },
];

export const INITIAL_TEAMS: InitialTeamSeed[] = SEED_ROWS.map((row) => ({
  ...row,
  logoUrl: defaultTeamLogoUrl(row.abbreviation),
}));
