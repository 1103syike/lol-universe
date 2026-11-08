import type { Rng } from '../rng';
import { DiscreteScheduler } from '../scheduler/discrete-scheduler';
import type { TeamSide } from '../types/ids';
import type { VersionPack } from '../version/version-pack';
import type {
  ChampionEntity,
  MinionEntity,
  MonsterEntity,
  StructureEntity,
} from './entities';

export interface TeamRuntime {
  teamId: string;
  side: TeamSide;
  dragonStacks: number;
  hasBaron: boolean;
  hasSoul: boolean;
}

export interface GameState {
  matchId: string;
  versionId: string;
  seed: string | number;
  lockedPack: VersionPack;
  scheduler: DiscreteScheduler;
  rng: Rng;
  ended: boolean;
  winnerTeamId: string | null;
  endReason: 'nexus' | 'timeout' | null;
  blue: TeamRuntime;
  red: TeamRuntime;
  champions: ChampionEntity[];
  minions: MinionEntity[];
  monsters: MonsterEntity[];
  structures: StructureEntity[];
  waveIndex: number;
  nextEntitySeq: number;
  goldSamples: Array<{ t: number; blue: number; red: number }>;
}

export function createEmptyGameState(
  matchId: string,
  pack: VersionPack,
  seed: string | number,
  rng: Rng,
  blueTeamId: string,
  redTeamId: string,
): GameState {
  return {
    matchId,
    versionId: pack.manifest.id,
    seed,
    lockedPack: pack,
    scheduler: new DiscreteScheduler(),
    rng,
    ended: false,
    winnerTeamId: null,
    endReason: null,
    blue: {
      teamId: blueTeamId,
      side: 'blue',
      dragonStacks: 0,
      hasBaron: false,
      hasSoul: false,
    },
    red: {
      teamId: redTeamId,
      side: 'red',
      dragonStacks: 0,
      hasBaron: false,
      hasSoul: false,
    },
    champions: [],
    minions: [],
    monsters: [],
    structures: [],
    waveIndex: 0,
    nextEntitySeq: 1,
    goldSamples: [],
  };
}

export function allocEntityId(state: GameState, prefix: string): string {
  const id = `${prefix}_${state.nextEntitySeq}`;
  state.nextEntitySeq += 1;
  return id;
}

export function teamGold(state: GameState, side: TeamSide): number {
  return state.champions
    .filter((champ) => champ.side === side)
    .reduce((sum, champ) => sum + champ.earnedGold, 0);
}

export function pushGoldSample(state: GameState): void {
  const t = state.scheduler.time;
  const blue = teamGold(state, 'blue');
  const red = teamGold(state, 'red');
  const last = state.goldSamples[state.goldSamples.length - 1];
  if (last && Math.abs(last.t - t) < 0.75) {
    last.t = t;
    last.blue = blue;
    last.red = red;
    return;
  }
  state.goldSamples.push({ t, blue, red });
}

export function teamPocketGold(state: GameState, side: TeamSide): number {
  return state.champions
    .filter((champ) => champ.side === side)
    .reduce((sum, champ) => sum + champ.gold, 0);
}

export function findChampion(state: GameState, id: string): ChampionEntity | undefined {
  return state.champions.find((champ) => champ.id === id);
}

export function livingChampions(state: GameState, side?: TeamSide): ChampionEntity[] {
  return state.champions.filter((champ) => champ.alive && (side ? champ.side === side : true));
}
