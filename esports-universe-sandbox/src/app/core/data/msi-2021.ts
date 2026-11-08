export interface MsiRosterPlayer {
  role: string;
  gamertag: string;
}

export interface MsiGuestTeam {
  id: string;
  abbreviation: string;
  name: string;
  region: string;
  logoUrl: string | null;
  roster: MsiRosterPlayer[];
}

export interface MsiGroupFixture {
  id: string;
  date: string;
  group: 'A' | 'B' | 'C';
  leftId: string;
  rightId: string;
}

export const MSI_PCS_SLOT = 'pcs';

export const MSI_2021_GROUPS: Record<'A' | 'B' | 'C', string[]> = {
  A: ['rng', 'pgg', 'uol'],
  B: ['mad', 'pcs', 'png', 'iw'],
  C: ['dk', 'c9', 'dfm', 'inf'],
};

const line = (top: string, jungle: string, mid: string, bot: string, support: string): MsiRosterPlayer[] => [
  { role: '上路', gamertag: top },
  { role: '打野', gamertag: jungle },
  { role: '中路', gamertag: mid },
  { role: '下路', gamertag: bot },
  { role: '輔助', gamertag: support },
];

export const MSI_2021_GUESTS: MsiGuestTeam[] = [
  { id: 'rng', abbreviation: 'RNG', name: 'Royal Never Give Up', region: 'LPL', logoUrl: '/team-logos/rng.png', roster: line('Xiaohu', 'Wei', 'Cryin', 'GALA', 'Ming') },
  { id: 'pgg', abbreviation: 'PGG', name: 'Pentanet.GG', region: 'LCO', logoUrl: '/team-logos/pgg.png', roster: line('BioPanther', 'Pabu', 'Chazz', 'Praedyth', 'Decoy') },
  { id: 'uol', abbreviation: 'UOL', name: 'Unicorns of Love', region: 'LCL', logoUrl: '/team-logos/uol.png', roster: line('BOSS', 'AHaHaCiK', 'Nomanz', 'Lodik', 'SaNTaS') },
  { id: 'mad', abbreviation: 'MAD', name: 'MAD Lions', region: 'LEC', logoUrl: '/team-logos/mad-lions.png', roster: line('Armut', 'Elyoya', 'Humanoid', 'Carzzy', 'Kaiser') },
  { id: 'iw', abbreviation: 'IW', name: 'İstanbul Wildcats', region: 'TCL', logoUrl: '/team-logos/iw.png', roster: line('StarScreen', 'Ferret', 'Serin', 'HolyPhoenix', 'Farfetch') },
  { id: 'png', abbreviation: 'PNG', name: 'paiN Gaming', region: 'CBLOL', logoUrl: '/team-logos/png.png', roster: line('Robo', 'CarioK', 'tinowns', 'brTT', 'Luci') },
  { id: 'dk', abbreviation: 'DK', name: 'DWG KIA', region: 'LCK', logoUrl: '/team-logos/dwg.png', roster: line('Khan', 'Canyon', 'ShowMaker', 'Ghost', 'BeryL') },
  { id: 'c9', abbreviation: 'C9', name: 'Cloud9', region: 'LCS', logoUrl: '/team-logos/c9.png', roster: line('Fudge', 'Blaber', 'Perkz', 'Zven', 'Vulcan') },
  { id: 'dfm', abbreviation: 'DFM', name: 'DetonatioN FocusMe', region: 'LJL', logoUrl: '/team-logos/dfm.png', roster: line('Evi', 'Steal', 'Aria', 'Yutapon', 'Kazu') },
  { id: 'inf', abbreviation: 'INF', name: 'Infinity Esports', region: 'LLA', logoUrl: '/team-logos/inf.png', roster: line('Buggax', 'SolidSnake', 'cody', 'WhiteLotus', 'Ackerman') },
];

export const MSI_2021_GROUP_MATCHES: MsiGroupFixture[] = [
  { id: 'g-0506-1', date: '2021-05-06', group: 'C', leftId: 'dk', rightId: 'c9' },
  { id: 'g-0506-2', date: '2021-05-06', group: 'C', leftId: 'inf', rightId: 'dfm' },
  { id: 'g-0506-3', date: '2021-05-06', group: 'A', leftId: 'rng', rightId: 'pgg' },
  { id: 'g-0506-4', date: '2021-05-06', group: 'A', leftId: 'pgg', rightId: 'uol' },
  { id: 'g-0506-5', date: '2021-05-06', group: 'B', leftId: 'iw', rightId: 'png' },
  { id: 'g-0506-6', date: '2021-05-06', group: 'B', leftId: 'mad', rightId: 'pcs' },
  { id: 'g-0507-1', date: '2021-05-07', group: 'A', leftId: 'pgg', rightId: 'rng' },
  { id: 'g-0507-2', date: '2021-05-07', group: 'A', leftId: 'uol', rightId: 'rng' },
  { id: 'g-0507-3', date: '2021-05-07', group: 'C', leftId: 'inf', rightId: 'dk' },
  { id: 'g-0507-4', date: '2021-05-07', group: 'C', leftId: 'dfm', rightId: 'c9' },
  { id: 'g-0507-5', date: '2021-05-07', group: 'B', leftId: 'iw', rightId: 'mad' },
  { id: 'g-0507-6', date: '2021-05-07', group: 'B', leftId: 'png', rightId: 'pcs' },
  { id: 'g-0508-1', date: '2021-05-08', group: 'A', leftId: 'rng', rightId: 'uol' },
  { id: 'g-0508-2', date: '2021-05-08', group: 'A', leftId: 'uol', rightId: 'pgg' },
  { id: 'g-0508-3', date: '2021-05-08', group: 'C', leftId: 'dk', rightId: 'dfm' },
  { id: 'g-0508-4', date: '2021-05-08', group: 'C', leftId: 'c9', rightId: 'inf' },
  { id: 'g-0508-5', date: '2021-05-08', group: 'B', leftId: 'mad', rightId: 'png' },
  { id: 'g-0508-6', date: '2021-05-08', group: 'B', leftId: 'pcs', rightId: 'iw' },
  { id: 'g-0509-1', date: '2021-05-09', group: 'A', leftId: 'uol', rightId: 'rng' },
  { id: 'g-0509-2', date: '2021-05-09', group: 'A', leftId: 'uol', rightId: 'pgg' },
  { id: 'g-0509-3', date: '2021-05-09', group: 'A', leftId: 'rng', rightId: 'pgg' },
  { id: 'g-0509-4', date: '2021-05-09', group: 'A', leftId: 'rng', rightId: 'uol' },
  { id: 'g-0509-5', date: '2021-05-09', group: 'A', leftId: 'pgg', rightId: 'uol' },
  { id: 'g-0509-6', date: '2021-05-09', group: 'A', leftId: 'pgg', rightId: 'rng' },
  { id: 'g-0510-1', date: '2021-05-10', group: 'B', leftId: 'mad', rightId: 'iw' },
  { id: 'g-0510-2', date: '2021-05-10', group: 'B', leftId: 'pcs', rightId: 'png' },
  { id: 'g-0510-3', date: '2021-05-10', group: 'B', leftId: 'iw', rightId: 'pcs' },
  { id: 'g-0510-4', date: '2021-05-10', group: 'B', leftId: 'png', rightId: 'mad' },
  { id: 'g-0510-5', date: '2021-05-10', group: 'B', leftId: 'png', rightId: 'iw' },
  { id: 'g-0510-6', date: '2021-05-10', group: 'B', leftId: 'pcs', rightId: 'mad' },
  { id: 'g-0511-1', date: '2021-05-11', group: 'C', leftId: 'c9', rightId: 'dk' },
  { id: 'g-0511-2', date: '2021-05-11', group: 'C', leftId: 'dfm', rightId: 'inf' },
  { id: 'g-0511-3', date: '2021-05-11', group: 'C', leftId: 'dk', rightId: 'inf' },
  { id: 'g-0511-4', date: '2021-05-11', group: 'C', leftId: 'c9', rightId: 'dfm' },
  { id: 'g-0511-5', date: '2021-05-11', group: 'C', leftId: 'dfm', rightId: 'dk' },
  { id: 'g-0511-6', date: '2021-05-11', group: 'C', leftId: 'inf', rightId: 'c9' },
];
