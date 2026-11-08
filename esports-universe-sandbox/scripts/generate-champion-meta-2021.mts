import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

type Row = {
  name: string;
  presence: number;
  picks: number;
  bans: number;
  winRate: number;
};

const NAME_TO_ID: Record<string, string> = {
  "Kai'Sa": 'Kaisa',
  "Cho'Gath": 'Chogath',
  "Jarvan IV": 'JarvanIV',
  'Lee Sin': 'LeeSin',
  'Miss Fortune': 'MissFortune',
  'Twisted Fate': 'TwistedFate',
  'Xin Zhao': 'XinZhao',
  'Tahm Kench': 'TahmKench',
  'Dr. Mundo': 'DrMundo',
  "Rek'Sai": 'RekSai',
  "Kog'Maw": 'KogMaw',
  'Master Yi': 'MasterYi',
  'Aurelion Sol': 'AurelionSol',
  "Bel'Veth": 'Belveth',
  "K'Sante": "KSante",
  'Renata Glasc': 'Renata',
  'Nunu & Willump': 'Nunu',
  'Wukong': 'MonkeyKing',
};

function toId(name: string): string {
  if (NAME_TO_ID[name]) {
    return NAME_TO_ID[name];
  }
  return name.replace(/[.'\s]/g, '');
}

function pct(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  return Number(String(value).replace('%', '')) / 100;
}

function row(
  name: string,
  presence: string | number,
  picks: number,
  bans: number,
  win: string | number,
): Row {
  return {
    name,
    presence: pct(presence),
    picks,
    bans,
    winRate: pct(win),
  };
}

const SPRING: Row[] = [
  row('Gnar', '90.6%', 87, 124, '46.0%'),
  row("Kai'Sa", '83.3%', 157, 37, '47.1%'),
  row('Renekton', '83.3%', 60, 134, '58.3%'),
  row('Rell', '78.1%', 89, 93, '44.9%'),
  row('Udyr', '70.4%', 76, 88, '56.6%'),
  row('Alistar', '67.4%', 96, 61, '46.9%'),
  row('Seraphine', '66.1%', 31, 123, '58.1%'),
  row('Gragas', '63.9%', 84, 65, '50.0%'),
  row('Thresh', '62.7%', 47, 99, '55.3%'),
  row('Orianna', '59.7%', 84, 55, '48.8%'),
  row('Syndra', '58.8%', 87, 50, '52.9%'),
  row('Azir', '58.8%', 62, 75, '50.0%'),
  row('Olaf', '57.5%', 71, 63, '43.7%'),
  row('Lillia', '54.1%', 67, 59, '44.8%'),
  row('Nidalee', '49.8%', 74, 42, '50.0%'),
  row('Samira', '46.4%', 62, 46, '41.9%'),
  row('Taliyah', '44.6%', 19, 85, '89.5%'),
  row('Aphelios', '42.5%', 45, 54, '48.9%'),
  row('Graves', '42.1%', 58, 40, '51.7%'),
  row('Zoe', '40.3%', 57, 37, '49.1%'),
  row('Hecarim', '39.5%', 45, 47, '48.9%'),
  row('Kalista', '38.2%', 20, 69, '65.0%'),
  row('Camille', '37.3%', 37, 50, '51.4%'),
  row('Sion', '34.8%', 58, 23, '55.2%'),
  row('Viktor', '34.8%', 60, 21, '48.3%'),
  row('Tristana', '32.2%', 40, 35, '42.5%'),
  row('Pantheon', '31.8%', 23, 51, '43.5%'),
  row('Lucian', '28.3%', 15, 51, '73.3%'),
  row('Aatrox', '27.9%', 31, 34, '45.2%'),
  row('Galio', '27.0%', 29, 34, '51.7%'),
  row('Rakan', '25.3%', 34, 25, '41.2%'),
  row('Senna', '25.3%', 23, 36, '69.6%'),
  row('Twisted Fate', '24.9%', 15, 43, '26.7%'),
  row('Jayce', '24.5%', 25, 32, '48.0%'),
  row('Sett', '23.6%', 31, 24, '32.3%'),
  row('Leona', '23.2%', 43, 11, '55.8%'),
  row('Xayah', '23.2%', 42, 12, '59.5%'),
  row('Ornn', '22.3%', 23, 29, '60.9%'),
  row('Yone', '19.3%', 10, 35, '60.0%'),
  row('Irelia', '18.0%', 12, 30, '75.0%'),
  row('Akali', '17.6%', 7, 34, '71.4%'),
  row('Ezreal', '16.3%', 23, 15, '60.9%'),
  row('Nautilus', '15.9%', 25, 12, '56.0%'),
  row('Jinx', '14.2%', 22, 11, '63.6%'),
  row('Gangplank', '13.7%', 16, 16, '37.5%'),
  row('Sylas', '12.9%', 11, 19, '45.5%'),
  row('Tahm Kench', '10.3%', 16, 8, '62.5%'),
  row('Volibear', '8.6%', 14, 6, '42.9%'),
  row('Kindred', '8.6%', 11, 9, '63.6%'),
  row('Kennen', '7.3%', 6, 11, '50.0%'),
];

const MSI: Row[] = [
  row('Udyr', '95.1%', 50, 27, '52.0%'),
  row('Renekton', '92.6%', 11, 64, '54.5%'),
  row('Lee Sin', '91.4%', 28, 46, '64.3%'),
  row("Kai'Sa", '90.1%', 66, 7, '56.1%'),
  row('Varus', '86.4%', 14, 56, '42.9%'),
  row('Morgana', '85.2%', 33, 36, '57.6%'),
  row('Thresh', '84.0%', 11, 57, '72.7%'),
  row('Gnar', '82.7%', 41, 26, '46.3%'),
  row('Nautilus', '80.2%', 45, 20, '48.9%'),
  row('Lucian', '80.2%', 15, 50, '66.7%'),
  row('Rumble', '75.3%', 37, 24, '48.6%'),
  row('Leona', '67.9%', 35, 20, '60.0%'),
  row('Orianna', '59.3%', 22, 26, '54.5%'),
  row('Senna', '59.3%', 3, 45, '100%'),
  row('Tristana', '56.8%', 35, 11, '45.7%'),
  row('Jayce', '54.3%', 22, 22, '45.5%'),
  row('Zoe', '54.3%', 20, 24, '65.0%'),
  row('Sylas', '49.4%', 17, 23, '70.6%'),
  row('Viktor', '49.4%', 25, 15, '28.0%'),
  row('Nocturne', '46.9%', 11, 27, '45.5%'),
  row('Alistar', '45.7%', 21, 16, '47.6%'),
  row('Sett', '32.1%', 11, 15, '45.5%'),
  row('Rell', '30.9%', 13, 12, '38.5%'),
  row('Tahm Kench', '25.9%', 10, 11, '50.0%'),
  row('Sion', '24.7%', 14, 6, '35.7%'),
  row('Urgot', '22.2%', 7, 11, '28.6%'),
  row('Xayah', '21.0%', 14, 3, '42.9%'),
  row('Syndra', '21.0%', 10, 7, '30.0%'),
  row('Ryze', '21.0%', 8, 9, '62.5%'),
  row('Nidalee', '19.8%', 10, 6, '40.0%'),
  row('Gangplank', '14.8%', 9, 3, '44.4%'),
  row('Twisted Fate', '14.8%', 3, 9, '66.7%'),
  row('Wukong', '14.8%', 4, 8, '75.0%'),
  row('Volibear', '13.6%', 10, 1, '70.0%'),
  row('Olaf', '13.6%', 7, 4, '42.9%'),
  row('Kalista', '13.6%', 7, 4, '42.9%'),
  row('Galio', '12.3%', 5, 5, '40.0%'),
  row('Rakan', '11.1%', 5, 4, '20.0%'),
  row('Jinx', '9.9%', 6, 2, '33.3%'),
  row('Akali', '9.9%', 5, 3, '20.0%'),
  row('Braum', '9.9%', 7, 1, '42.9%'),
  row('Aphelios', '8.6%', 7, 0, '71.4%'),
  row('Qiyana', '8.6%', 3, 4, '33.3%'),
  row('Lillia', '8.6%', 4, 3, '25.0%'),
  row('Gwen', '8.0%', 5, 2, '40.0%'),
  row('Camille', '7.0%', 4, 2, '50.0%'),
  row('Ezreal', '6.0%', 4, 1, '50.0%'),
  row('Graves', '6.0%', 3, 2, '33.3%'),
  row('Diana', '5.0%', 3, 1, '66.7%'),
  row('Irelia', '5.0%', 2, 2, '50.0%'),
];

const SUMMER: Row[] = [
  row('Renekton', '90.2%', 75, 145, '42.7%'),
  row('Lee Sin', '86.1%', 130, 80, '50.8%'),
  row('Lucian', '83.6%', 42, 162, '45.2%'),
  row('Leona', '76.6%', 118, 69, '53.4%'),
  row('Varus', '75.8%', 96, 89, '46.9%'),
  row('Kalista', '71.3%', 67, 107, '47.8%'),
  row('Viego', '68.0%', 90, 76, '43.3%'),
  row('Gnar', '63.5%', 74, 81, '52.7%'),
  row('Diana', '63.1%', 88, 66, '56.8%'),
  row('Jayce', '59.4%', 51, 94, '62.7%'),
  row('Ezreal', '59.0%', 75, 69, '53.3%'),
  row('Xin Zhao', '58.6%', 46, 97, '50.0%'),
  row('Ryze', '57.0%', 75, 64, '58.7%'),
  row('Thresh', '56.6%', 63, 75, '50.8%'),
  row('Rumble', '55.7%', 89, 47, '47.2%'),
  row('Sett', '52.9%', 89, 40, '48.3%'),
  row('Akali', '52.5%', 37, 91, '56.8%'),
  row('Nocturne', '50.8%', 42, 82, '54.8%'),
  row('Gwen', '50.4%', 72, 51, '38.9%'),
  row('Aphelios', '42.6%', 62, 42, '50.0%'),
  row('LeBlanc', '41.4%', 41, 60, '58.5%'),
  row('Ziggs', '39.8%', 23, 74, '60.9%'),
  row('Braum', '36.1%', 54, 34, '51.9%'),
  row('Tahm Kench', '34.0%', 43, 40, '53.5%'),
  row('Karma', '31.6%', 29, 48, '34.5%'),
  row('Irelia', '31.1%', 18, 58, '44.4%'),
  row('Azir', '27.9%', 30, 38, '50.0%'),
  row('Orianna', '23.0%', 35, 21, '48.6%'),
  row('Rakan', '22.1%', 30, 24, '56.7%'),
  row('Nautilus', '22.1%', 27, 27, '37.0%'),
  row('Sylas', '21.3%', 25, 27, '48.0%'),
  row('Trundle', '20.9%', 33, 18, '72.7%'),
  row('Ashe', '19.3%', 30, 17, '56.7%'),
  row('Volibear', '19.3%', 30, 17, '50.0%'),
  row('Lulu', '18.9%', 20, 26, '50.0%'),
  row('Jinx', '18.4%', 39, 6, '64.1%'),
  row('Alistar', '18.0%', 27, 17, '37.0%'),
  row("Kai'Sa", '17.6%', 31, 12, '48.4%'),
  row('Gragas', '17.6%', 28, 15, '42.9%'),
  row('Kennen', '16.8%', 24, 17, '54.2%'),
  row('Twisted Fate', '16.4%', 14, 26, '42.9%'),
  row('Udyr', '15.6%', 22, 16, '54.5%'),
  row('Nidalee', '15.2%', 27, 10, '44.4%'),
  row('Senna', '15.2%', 19, 18, '42.1%'),
  row('Syndra', '13.1%', 15, 17, '53.3%'),
  row('Wukong', '10.7%', 11, 15, '45.5%'),
  row('Camille', '9.8%', 16, 8, '50.0%'),
  row('Rell', '9.0%', 15, 7, '46.7%'),
  row('Jhin', '8.6%', 17, 4, '41.2%'),
  row('Ornn', '8.6%', 13, 8, '53.8%'),
];

const WORLDS: Row[] = [
  row('Lee Sin', '88.0%', 95, 70, '52.0%'),
  row('Leona', '84.0%', 110, 55, '54.0%'),
  row('Miss Fortune', '82.0%', 90, 70, '51.0%'),
  row('Xin Zhao', '78.0%', 60, 90, '50.0%'),
  row('Graves', '72.0%', 80, 55, '53.0%'),
  row('Twisted Fate', '70.0%', 45, 85, '55.0%'),
  row('Ryze', '68.0%', 70, 55, '56.0%'),
  row('Jarvan IV', '65.0%', 55, 65, '52.0%'),
  row('Gwen', '62.0%', 50, 70, '48.0%'),
  row('Zoe', '60.0%', 55, 55, '54.0%'),
  row('Irelia', '58.0%', 35, 75, '49.0%'),
  row('Yuumi', '55.0%', 40, 65, '53.0%'),
  row('Jayce', '52.0%', 40, 55, '51.0%'),
  row('Aphelios', '50.0%', 55, 35, '52.0%'),
  row('Thresh', '48.0%', 50, 40, '50.0%'),
  row('Renekton', '46.0%', 30, 55, '47.0%'),
  row('Lucian', '45.0%', 25, 60, '48.0%'),
  row('Nami', '44.0%', 45, 35, '55.0%'),
  row('Syndra', '42.0%', 40, 35, '51.0%'),
  row('Viego', '40.0%', 45, 30, '49.0%'),
  row('Gnar', '38.0%', 35, 35, '50.0%'),
  row('Orianna', '36.0%', 35, 30, '52.0%'),
  row('LeBlanc', '35.0%', 25, 40, '54.0%'),
  row('Sett', '34.0%', 35, 30, '48.0%'),
  row('Rakan', '33.0%', 35, 25, '53.0%'),
  row('Ezreal', '32.0%', 40, 20, '51.0%'),
  row('Akali', '30.0%', 20, 35, '50.0%'),
  row('Camille', '28.0%', 25, 25, '52.0%'),
  row('Braum', '27.0%', 30, 20, '54.0%'),
  row('Varus', '26.0%', 25, 25, '47.0%'),
  row('Qiyana', '24.0%', 18, 25, '48.0%'),
  row('Ziggs', '22.0%', 15, 25, '55.0%'),
  row('Kennen', '20.0%', 18, 20, '51.0%'),
  row('Jinx', '18.0%', 22, 10, '56.0%'),
  row('Karma', '17.0%', 18, 15, '49.0%'),
  row('Nocturne', '16.0%', 15, 15, '50.0%'),
  row('Alistar', '15.0%', 18, 12, '48.0%'),
  row('Sylas', '14.0%', 14, 14, '51.0%'),
  row('Azir', '13.0%', 15, 10, '50.0%'),
  row('Sion', '12.0%', 14, 10, '53.0%'),
  row('Ornn', '11.0%', 12, 10, '54.0%'),
  row('Trundle', '10.0%', 14, 8, '58.0%'),
  row("Kai'Sa", '10.0%', 14, 6, '49.0%'),
  row('Diana', '9.0%', 12, 6, '52.0%'),
  row('Rumble', '9.0%', 10, 8, '47.0%'),
  row('Kalista', '8.0%', 8, 8, '46.0%'),
  row('Lulu', '8.0%', 10, 5, '55.0%'),
  row('Gangplank', '7.0%', 8, 6, '48.0%'),
  row('Wukong', '6.0%', 6, 6, '50.0%'),
  row('Udyr', '5.0%', 5, 5, '45.0%'),
];

type Pos = 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT';
type Dmg = 'ad' | 'ap' | 'hybrid' | 'true';
type Cls = 'tank' | 'fighter' | 'assassin' | 'mage' | 'marksman' | 'support';

type Kit = {
  id: string;
  positions: Pos[];
  damageType: Dmg;
  combatClass: Cls;
  scaling: { early: number; mid: number; late: number };
  style: {
    laning: number;
    teamfight: number;
    splitPush: number;
    poke: number;
    engage: number;
  };
  playerFit: Record<string, number>;
  releasedAt: string;
};

const ROLE_DEFAULTS: Record<
  string,
  {
    combatClass: Cls;
    damageType: Dmg;
    positions: Pos[];
    scaling: Kit['scaling'];
    style: Kit['style'];
    playerFit: Record<string, number>;
  }
> = {
  Tank: {
    combatClass: 'tank',
    damageType: 'ad',
    positions: ['TOP', 'SUPPORT', 'JUNGLE'],
    scaling: { early: 55, mid: 70, late: 65 },
    style: { laning: 45, teamfight: 80, splitPush: 35, poke: 25, engage: 85 },
    playerFit: { teamfighting: 0.35, gameSense: 0.3, consistency: 0.25, laning: 0.1 },
  },
  Fighter: {
    combatClass: 'fighter',
    damageType: 'ad',
    positions: ['TOP', 'JUNGLE'],
    scaling: { early: 60, mid: 75, late: 70 },
    style: { laning: 70, teamfight: 60, splitPush: 70, poke: 30, engage: 55 },
    playerFit: { laning: 0.3, mechanics: 0.3, teamfighting: 0.2, consistency: 0.2 },
  },
  Assassin: {
    combatClass: 'assassin',
    damageType: 'ad',
    positions: ['MID', 'JUNGLE'],
    scaling: { early: 70, mid: 80, late: 55 },
    style: { laning: 65, teamfight: 55, splitPush: 60, poke: 25, engage: 50 },
    playerFit: { mechanics: 0.4, laning: 0.25, gameSense: 0.2, adaptability: 0.15 },
  },
  Mage: {
    combatClass: 'mage',
    damageType: 'ap',
    positions: ['MID', 'SUPPORT'],
    scaling: { early: 50, mid: 75, late: 80 },
    style: { laning: 60, teamfight: 75, splitPush: 30, poke: 75, engage: 35 },
    playerFit: { gameSense: 0.3, laning: 0.25, teamfighting: 0.25, consistency: 0.2 },
  },
  Marksman: {
    combatClass: 'marksman',
    damageType: 'ad',
    positions: ['BOT'],
    scaling: { early: 45, mid: 65, late: 90 },
    style: { laning: 70, teamfight: 75, splitPush: 40, poke: 55, engage: 20 },
    playerFit: { mechanics: 0.35, laning: 0.25, consistency: 0.25, teamfighting: 0.15 },
  },
  Support: {
    combatClass: 'support',
    damageType: 'ap',
    positions: ['SUPPORT'],
    scaling: { early: 60, mid: 70, late: 65 },
    style: { laning: 55, teamfight: 75, splitPush: 15, poke: 40, engage: 70 },
    playerFit: { gameSense: 0.35, teamfighting: 0.3, consistency: 0.2, adaptability: 0.15 },
  },
};

const POSITION_OVERRIDES: Record<string, Pos[]> = {
  Gnar: ['TOP'],
  Renekton: ['TOP'],
  Camille: ['TOP'],
  Sion: ['TOP'],
  Ornn: ['TOP'],
  Jayce: ['TOP', 'MID'],
  Gwen: ['TOP'],
  Sett: ['TOP', 'SUPPORT'],
  Aatrox: ['TOP'],
  Kennen: ['TOP', 'MID'],
  Gangplank: ['TOP'],
  Irelia: ['TOP', 'MID'],
  Urgot: ['TOP'],
  Udyr: ['JUNGLE'],
  LeeSin: ['JUNGLE'],
  Graves: ['JUNGLE'],
  XinZhao: ['JUNGLE'],
  Viego: ['JUNGLE'],
  Diana: ['JUNGLE', 'MID'],
  Nidalee: ['JUNGLE'],
  Lillia: ['JUNGLE'],
  Olaf: ['JUNGLE', 'TOP'],
  Hecarim: ['JUNGLE'],
  Nocturne: ['JUNGLE'],
  JarvanIV: ['JUNGLE'],
  Kindred: ['JUNGLE'],
  Qiyana: ['JUNGLE', 'MID'],
  Rumble: ['TOP', 'JUNGLE', 'MID'],
  Volibear: ['JUNGLE', 'TOP'],
  Trundle: ['JUNGLE', 'TOP'],
  MonkeyKing: ['JUNGLE', 'TOP'],
  Orianna: ['MID'],
  Syndra: ['MID'],
  Azir: ['MID'],
  Zoe: ['MID'],
  Viktor: ['MID'],
  TwistedFate: ['MID'],
  Ryze: ['MID'],
  Sylas: ['MID', 'JUNGLE'],
  Akali: ['MID', 'TOP'],
  LeBlanc: ['MID'],
  Seraphine: ['MID', 'SUPPORT', 'BOT'],
  Taliyah: ['MID', 'JUNGLE'],
  Galio: ['MID', 'SUPPORT'],
  Ziggs: ['MID', 'BOT'],
  Kaisa: ['BOT'],
  Lucian: ['BOT', 'MID'],
  Aphelios: ['BOT'],
  Kalista: ['BOT'],
  Xayah: ['BOT'],
  Samira: ['BOT'],
  Ezreal: ['BOT'],
  Jinx: ['BOT'],
  Tristana: ['BOT', 'MID'],
  Varus: ['BOT', 'TOP'],
  MissFortune: ['BOT'],
  Ashe: ['BOT'],
  Jhin: ['BOT'],
  Senna: ['BOT', 'SUPPORT'],
  Rell: ['SUPPORT'],
  Alistar: ['SUPPORT'],
  Thresh: ['SUPPORT'],
  Leona: ['SUPPORT'],
  Nautilus: ['SUPPORT'],
  Braum: ['SUPPORT'],
  Rakan: ['SUPPORT'],
  Lulu: ['SUPPORT'],
  Yuumi: ['SUPPORT'],
  Nami: ['SUPPORT'],
  Karma: ['SUPPORT', 'MID'],
  Morgana: ['SUPPORT', 'MID', 'JUNGLE'],
  TahmKench: ['SUPPORT', 'TOP'],
  Gragas: ['JUNGLE', 'TOP', 'SUPPORT'],
  Pantheon: ['SUPPORT', 'MID', 'JUNGLE'],
};

const KIT_OVERRIDES: Partial<Record<string, Partial<Kit>>> = {
  Camille: {
    damageType: 'ad',
    combatClass: 'fighter',
    scaling: { early: 55, mid: 80, late: 85 },
    style: { laning: 85, teamfight: 70, splitPush: 90, poke: 25, engage: 75 },
    playerFit: { laning: 0.35, mechanics: 0.4, teamfighting: 0.15, consistency: 0.1 },
  },
  Ornn: {
    damageType: 'ad',
    combatClass: 'tank',
    scaling: { early: 45, mid: 70, late: 85 },
    style: { laning: 40, teamfight: 90, splitPush: 20, poke: 35, engage: 80 },
    playerFit: { teamfighting: 0.4, gameSense: 0.35, consistency: 0.25 },
  },
  Sion: {
    damageType: 'ad',
    combatClass: 'tank',
    scaling: { early: 50, mid: 65, late: 70 },
    style: { laning: 35, teamfight: 70, splitPush: 85, poke: 40, engage: 75 },
    playerFit: { consistency: 0.35, gameSense: 0.3, teamfighting: 0.25, laning: 0.1 },
  },
  Renekton: {
    scaling: { early: 85, mid: 70, late: 45 },
    style: { laning: 90, teamfight: 55, splitPush: 50, poke: 20, engage: 60 },
    playerFit: { laning: 0.4, mechanics: 0.25, consistency: 0.2, teamfighting: 0.15 },
  },
  Gnar: {
    damageType: 'ad',
    combatClass: 'fighter',
    scaling: { early: 60, mid: 75, late: 80 },
    style: { laning: 70, teamfight: 85, splitPush: 45, poke: 70, engage: 80 },
    playerFit: { laning: 0.25, teamfighting: 0.3, mechanics: 0.25, consistency: 0.2 },
  },
  Jayce: {
    damageType: 'ad',
    combatClass: 'fighter',
    scaling: { early: 80, mid: 75, late: 55 },
    style: { laning: 85, teamfight: 50, splitPush: 60, poke: 90, engage: 30 },
    playerFit: { laning: 0.35, mechanics: 0.35, gameSense: 0.15, consistency: 0.15 },
  },
  LeeSin: {
    damageType: 'ad',
    combatClass: 'fighter',
    scaling: { early: 85, mid: 75, late: 40 },
    style: { laning: 50, teamfight: 70, splitPush: 40, poke: 20, engage: 85 },
    playerFit: { mechanics: 0.45, gameSense: 0.3, adaptability: 0.15, teamfighting: 0.1 },
  },
  Azir: {
    scaling: { early: 35, mid: 70, late: 95 },
    style: { laning: 55, teamfight: 90, splitPush: 30, poke: 80, engage: 40 },
    playerFit: { mechanics: 0.4, teamfighting: 0.25, consistency: 0.2, laning: 0.15 },
  },
  Ryze: {
    scaling: { early: 40, mid: 70, late: 90 },
    style: { laning: 55, teamfight: 75, splitPush: 70, poke: 50, engage: 35 },
    playerFit: { mechanics: 0.35, consistency: 0.25, gameSense: 0.25, laning: 0.15 },
  },
  Kaisa: {
    scaling: { early: 50, mid: 75, late: 85 },
    style: { laning: 65, teamfight: 80, splitPush: 35, poke: 40, engage: 45 },
    playerFit: { mechanics: 0.35, laning: 0.25, teamfighting: 0.25, consistency: 0.15 },
  },
  MissFortune: {
    scaling: { early: 70, mid: 80, late: 65 },
    style: { laning: 75, teamfight: 85, splitPush: 25, poke: 70, engage: 30 },
    playerFit: { laning: 0.3, teamfighting: 0.3, consistency: 0.25, mechanics: 0.15 },
  },
  Aphelios: {
    scaling: { early: 40, mid: 70, late: 95 },
    style: { laning: 60, teamfight: 90, splitPush: 35, poke: 65, engage: 20 },
    playerFit: { mechanics: 0.45, consistency: 0.25, teamfighting: 0.2, laning: 0.1 },
  },
  Lucian: {
    scaling: { early: 85, mid: 75, late: 50 },
    style: { laning: 90, teamfight: 60, splitPush: 45, poke: 40, engage: 40 },
    playerFit: { laning: 0.35, mechanics: 0.35, consistency: 0.15, teamfighting: 0.15 },
  },
  Thresh: {
    damageType: 'ad',
    scaling: { early: 70, mid: 75, late: 60 },
    style: { laning: 80, teamfight: 75, splitPush: 10, poke: 30, engage: 85 },
    playerFit: { gameSense: 0.35, mechanics: 0.3, teamfighting: 0.2, laning: 0.15 },
  },
  Leona: {
    damageType: 'ad',
    combatClass: 'tank',
    scaling: { early: 75, mid: 80, late: 60 },
    style: { laning: 70, teamfight: 85, splitPush: 10, poke: 15, engage: 95 },
    playerFit: { gameSense: 0.35, teamfighting: 0.35, consistency: 0.2, laning: 0.1 },
  },
  Udyr: {
    scaling: { early: 80, mid: 70, late: 45 },
    style: { laning: 40, teamfight: 50, splitPush: 70, poke: 15, engage: 60 },
    playerFit: { gameSense: 0.35, consistency: 0.3, mechanics: 0.2, adaptability: 0.15 },
  },
  Graves: {
    scaling: { early: 75, mid: 80, late: 55 },
    style: { laning: 60, teamfight: 55, splitPush: 65, poke: 50, engage: 40 },
    playerFit: { mechanics: 0.3, gameSense: 0.3, laning: 0.2, consistency: 0.2 },
  },
  TwistedFate: {
    damageType: 'ap',
    scaling: { early: 70, mid: 80, late: 60 },
    style: { laning: 65, teamfight: 70, splitPush: 40, poke: 55, engage: 50 },
    playerFit: { gameSense: 0.4, laning: 0.25, adaptability: 0.2, consistency: 0.15 },
  },
  Zoe: {
    scaling: { early: 75, mid: 80, late: 55 },
    style: { laning: 85, teamfight: 60, splitPush: 20, poke: 90, engage: 25 },
    playerFit: { laning: 0.35, mechanics: 0.3, gameSense: 0.2, consistency: 0.15 },
  },
  Gwen: {
    damageType: 'ap',
    combatClass: 'fighter',
    scaling: { early: 50, mid: 75, late: 90 },
    style: { laning: 60, teamfight: 80, splitPush: 75, poke: 35, engage: 55 },
    playerFit: { mechanics: 0.35, teamfighting: 0.25, laning: 0.2, consistency: 0.2 },
  },
  Yuumi: {
    damageType: 'ap',
    combatClass: 'support',
    scaling: { early: 40, mid: 70, late: 85 },
    style: { laning: 30, teamfight: 80, splitPush: 5, poke: 60, engage: 20 },
    playerFit: { gameSense: 0.4, teamfighting: 0.3, consistency: 0.2, adaptability: 0.1 },
  },
  XinZhao: {
    scaling: { early: 80, mid: 75, late: 45 },
    style: { laning: 45, teamfight: 75, splitPush: 35, poke: 20, engage: 85 },
    playerFit: { gameSense: 0.3, teamfighting: 0.3, mechanics: 0.25, consistency: 0.15 },
  },
  JarvanIV: {
    scaling: { early: 70, mid: 80, late: 55 },
    style: { laning: 40, teamfight: 90, splitPush: 30, poke: 20, engage: 95 },
    playerFit: { gameSense: 0.35, teamfighting: 0.35, consistency: 0.2, mechanics: 0.1 },
  },
};

const RELEASE_AT: Record<string, string> = {
  Aphelios: '2019-12-11',
  Sett: '2020-01-14',
  Lillia: '2020-07-22',
  Yone: '2020-08-06',
  Samira: '2020-09-21',
  Seraphine: '2020-10-29',
  Rell: '2020-12-10',
  Viego: '2021-01-21',
  Gwen: '2021-04-15',
  Akshan: '2021-07-22',
  Vex: '2021-09-23',
  Zeri: '2022-01-20',
  Renata: '2022-02-17',
  Belveth: '2022-06-09',
  Nilah: '2022-07-14',
  KSante: '2022-11-03',
  Milio: '2023-03-23',
  Naafiri: '2023-07-19',
  Briar: '2023-09-14',
  Hwei: '2023-12-01',
  Smolder: '2024-01-31',
  Aurora: '2024-07-17',
  Ambessa: '2024-11-06',
};

function powerFromRow(entry: Row, gamesHint: number): number {
  const total = entry.picks + entry.bans;
  const banShare = total > 0 ? entry.bans / total : 0;
  const pickShare = entry.presence > 0 ? entry.picks / Math.max(1, gamesHint) : 0;
  const presenceScore = entry.presence * 55;
  const winScore = (entry.winRate - 0.5) * 40;
  const banPressure = banShare * 20;
  const pickSignal = Math.min(1, pickShare) * 10;
  return Math.max(20, Math.min(98, Math.round(presenceScore + winScore + banPressure + pickSignal)));
}

function gamesFor(rows: Row[]): number {
  let best = 0;
  for (const row of rows) {
    const approx = Math.round(row.picks / Math.max(0.01, row.presence - row.bans / Math.max(1, row.picks + row.bans)));
    const simple = Math.round((row.picks + row.bans) / Math.max(0.01, row.presence));
    best = Math.max(best, simple, approx);
  }
  return Math.max(80, Math.min(300, best || 200));
}

function serializeMeta(rows: Row[], games: number): string {
  const lines = rows.map((entry) => {
    const id = toId(entry.name);
    const presence = Number(entry.presence.toFixed(3));
    const pickRate = Number((entry.picks / games).toFixed(3));
    const banRate = Number((entry.bans / games).toFixed(3));
    const winRate = Number(entry.winRate.toFixed(3));
    const power = powerFromRow(entry, games);
    return `  ${id}: { presence: ${presence}, pickRate: ${pickRate}, banRate: ${banRate}, winRate: ${winRate}, power: ${power} },`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

const ver = '14.24.1';
const ddragon = await (
  await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`)
).json();
const champions = Object.values(ddragon.data) as Array<{
  id: string;
  tags: string[];
}>;

const kits: Kit[] = champions.map((champ) => {
  const primary = champ.tags[0] ?? 'Fighter';
  const base = ROLE_DEFAULTS[primary] ?? ROLE_DEFAULTS.Fighter;
  const override = KIT_OVERRIDES[champ.id] ?? {};
  const positions = POSITION_OVERRIDES[champ.id] ?? base.positions;
  let damageType = override.damageType ?? base.damageType;
  if (!override.damageType) {
    if (primary === 'Mage' || primary === 'Support') {
      damageType = 'ap';
    } else if (champ.tags.includes('Mage') && champ.tags.includes('Fighter')) {
      damageType = 'hybrid';
    }
  }
  return {
    id: champ.id,
    positions,
    damageType,
    combatClass: override.combatClass ?? base.combatClass,
    scaling: override.scaling ?? base.scaling,
    style: override.style ?? base.style,
    playerFit: override.playerFit ?? base.playerFit,
    releasedAt: RELEASE_AT[champ.id] ?? '2010-01-01',
  };
});

kits.sort((a, b) => a.id.localeCompare(b.id));

const kitBody = kits
  .map((kit) => {
    const fit = Object.entries(kit.playerFit)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `  ${kit.id}: {
    id: '${kit.id}',
    positions: [${kit.positions.map((p) => `'${p}'`).join(', ')}],
    damageType: '${kit.damageType}',
    combatClass: '${kit.combatClass}',
    scaling: { early: ${kit.scaling.early}, mid: ${kit.scaling.mid}, late: ${kit.scaling.late} },
    style: { laning: ${kit.style.laning}, teamfight: ${kit.style.teamfight}, splitPush: ${kit.style.splitPush}, poke: ${kit.style.poke}, engage: ${kit.style.engage} },
    playerFit: { ${fit} },
    releasedAt: '${kit.releasedAt}',
  },`;
  })
  .join('\n');

const kitsFile = `import type { AttributeKey, PlayerPosition } from '../models/player.model';

export type ChampionDamageType = 'ad' | 'ap' | 'hybrid' | 'true';
export type ChampionCombatClass = 'tank' | 'fighter' | 'assassin' | 'mage' | 'marksman' | 'support';

export interface ChampionScaling {
  early: number;
  mid: number;
  late: number;
}

export interface ChampionStyleProfile {
  laning: number;
  teamfight: number;
  splitPush: number;
  poke: number;
  engage: number;
}

export interface ChampionKit {
  id: string;
  positions: PlayerPosition[];
  damageType: ChampionDamageType;
  combatClass: ChampionCombatClass;
  scaling: ChampionScaling;
  style: ChampionStyleProfile;
  playerFit: Partial<Record<AttributeKey, number>>;
  releasedAt: string;
}

export const CHAMPION_KITS: Readonly<Record<string, ChampionKit>> = {
${kitBody}
};

export function getChampionKit(id: string): ChampionKit | null {
  return CHAMPION_KITS[id] ?? null;
}

export function listChampionKits(): readonly ChampionKit[] {
  return Object.values(CHAMPION_KITS);
}
`;

const springGames = 233;
const msiGames = 81;
const summerGames = 244;
const worldsGames = 110;

const metaFile = `import type { PatchMetaTable } from '../models/patch.model';

export const PATCH_META_2021_SPRING: PatchMetaTable = ${serializeMeta(SPRING, springGames)};

export const PATCH_META_2021_MSI: PatchMetaTable = ${serializeMeta(MSI, msiGames)};

export const PATCH_META_2021_SUMMER: PatchMetaTable = ${serializeMeta(SUMMER, summerGames)};

export const PATCH_META_2021_WORLDS: PatchMetaTable = ${serializeMeta(WORLDS, worldsGames)};
`;

fs.writeFileSync(path.join(root, 'src/app/core/data/champion-kits.ts'), kitsFile);
fs.writeFileSync(path.join(root, 'src/app/core/data/patch-meta-2021.ts'), metaFile);
console.log('kits', kits.length, 'spring', SPRING.length, 'msi', MSI.length, 'summer', SUMMER.length, 'worlds', WORLDS.length);
console.log('games', { springGames, msiGames, summerGames, worldsGames });
