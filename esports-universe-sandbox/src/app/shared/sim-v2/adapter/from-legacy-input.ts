import { getChampionKit } from '../../../core/data/champion-kits';
import { getChampionById } from '../../../core/data/champions';
import type { Player, PlayerPosition } from '../../../core/models/player.model';
import { calculateChemistry } from '../../sim/chemistry';
import { runClassicDraft, type DraftPickEntry, type DraftResult, type DraftStep } from '../../sim/draft';
import type { SimulateGameInput } from '../../sim/match-engine';
import type { MatchDraftReport } from '../../sim/report';
import type { ChampionMetaEntry, PatchMetaTable } from '../../../core/models/patch.model';
import { resolvePatchMeta, resolvePatchVersion } from '../../sim/resolve-patch';
import { buildTeamProfile } from '../../sim/team-profile';
import type { V2RosterPlayer } from '../champion/spawn';
import type { SimulateV2Input } from '../engine';
import { hashSeed } from '../rng';
import { getVersionPack, listVersionIds } from '../version/registry';

export interface PreparedV2Match {
  input: SimulateV2Input;
  draft: DraftResult;
  steps: DraftStep[];
}

const PACK_SYNTH_META = {
  presence: 0.01,
  pickRate: 0.005,
  banRate: 0.005,
  winRate: 0.5,
} as const;

export function mergeVersionPatchMeta(base: PatchMetaTable, versionId: string): PatchMetaTable {
  const pack = getVersionPack(versionId);
  const merged: Record<string, ChampionMetaEntry> = { ...base };
  for (const championId of Object.keys(pack.champions)) {
    const strengthPower = pack.patchStrength[championId]?.power ?? 45;
    const prev = merged[championId];
    if (prev) {
      merged[championId] = {
        presence: prev.presence,
        pickRate: prev.pickRate,
        banRate: prev.banRate,
        winRate: prev.winRate,
        power: Math.round(prev.power * 0.55 + strengthPower * 0.45),
      };
      continue;
    }
    merged[championId] = {
      presence: PACK_SYNTH_META.presence,
      pickRate: PACK_SYNTH_META.pickRate,
      banRate: PACK_SYNTH_META.banRate,
      winRate: PACK_SYNTH_META.winRate,
      power: Math.round(strengthPower * 0.55),
    };
  }
  return merged;
}

const ROLE_FALLBACK_PREF: Record<PlayerPosition, readonly string[]> = {
  TOP: ['Gnar', 'Renekton', 'Camille', 'Aatrox', 'Garen'],
  JUNGLE: ['Udyr', 'Gragas', 'Olaf', 'Graves', 'LeeSin'],
  MID: ['Orianna', 'Syndra', 'Azir', 'Zoe', 'Annie'],
  BOT: ['Kaisa', 'Samira', 'Aphelios', 'Ezreal', 'Ashe'],
  SUPPORT: ['Rell', 'Alistar', 'Thresh', 'Leona', 'Nautilus'],
};

function starters(players: readonly Player[]): Player[] {
  const result: Player[] = [];
  for (const position of ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as PlayerPosition[]) {
    const found = players.find((player) => player.position === position);
    if (found) {
      result.push(found);
    }
  }
  return result;
}

export function resolveV2VersionId(dateIso?: string): string {
  const ids = listVersionIds();
  if (!dateIso) {
    if (ids.includes('2021-spring')) {
      return '2021-spring';
    }
    return ids.includes('demo-a') ? 'demo-a' : (ids[0] ?? 'demo-a');
  }
  const year = Number(dateIso.slice(0, 4));
  if (year === 2021 && ids.includes('2021-spring')) {
    return '2021-spring';
  }
  if (year >= 2024 && ids.includes('demo-b')) {
    return 'demo-b';
  }
  if (ids.includes('demo-a')) {
    return 'demo-a';
  }
  return ids[0] ?? 'demo-a';
}

function packRoleFallback(versionId: string, position: PlayerPosition): string {
  const pack = getVersionPack(versionId);
  for (const candidate of ROLE_FALLBACK_PREF[position]) {
    if (pack.champions[candidate]) {
      return candidate;
    }
  }
  for (const championId of Object.keys(pack.champions)) {
    const kit = getChampionKit(championId);
    if (kit?.positions.includes(position)) {
      return championId;
    }
  }
  return Object.keys(pack.champions)[0] ?? ROLE_FALLBACK_PREF[position][0];
}

function ensureChampion(versionId: string, championId: string, position: PlayerPosition): string {
  const pack = getVersionPack(versionId);
  if (pack.champions[championId]) {
    return championId;
  }
  return packRoleFallback(versionId, position);
}

export function toMatchDraftReport(draft: DraftResult): MatchDraftReport {
  return {
    patchId: draft.patch.id,
    patchLabel: draft.patch.label,
    riotPatch: draft.patch.riotPatch,
    blueTeamId: draft.blueTeamId,
    redTeamId: draft.redTeamId,
    bans: draft.bans,
    home: {
      teamId: draft.home.teamId,
      intent: draft.home.intent,
      power: draft.home.power,
      picks: draft.home.picks,
    },
    away: {
      teamId: draft.away.teamId,
      intent: draft.away.intent,
      power: draft.away.power,
      picks: draft.away.picks,
    },
    steps: draft.steps,
  };
}

export function prepareV2Match(input: SimulateGameInput, seed?: string | number): PreparedV2Match {
  const random = input.random ?? Math.random;
  const versionId = resolveV2VersionId(input.dateIso);
  const homePlayers = starters(input.home.players);
  const awayPlayers = starters(input.away.players);
  const home = buildTeamProfile(
    input.home.teamId,
    homePlayers,
    input.home.coach,
    random,
    calculateChemistry(homePlayers, input.home.coach),
  );
  const away = buildTeamProfile(
    input.away.teamId,
    awayPlayers,
    input.away.coach,
    random,
    calculateChemistry(awayPlayers, input.away.coach),
  );
  const patch = resolvePatchVersion(input.dateIso);
  const meta = mergeVersionPatchMeta(resolvePatchMeta(patch), versionId);
  const pack = getVersionPack(versionId);
  const allowedChampionIds = new Set(Object.keys(pack.champions));
  const draft = runClassicDraft({ home, away, patch, meta, random, allowedChampionIds });
  const pickMap = new Map<string, string>();
  for (const pick of [...draft.home.picks, ...draft.away.picks]) {
    const locked = ensureChampion(versionId, pick.championId, pick.position);
    pick.championId = locked;
    pick.championNameZh = getChampionById(locked)?.nameZh ?? locked;
    pickMap.set(pick.playerId, locked);
  }
  draft.bans = draft.bans.filter((ban) => allowedChampionIds.has(ban.championId));
  draft.steps = draft.steps
    .map((step) => {
      if (step.kind === 'ban') {
        if (!allowedChampionIds.has(step.championId)) {
          return null;
        }
        return step;
      }
      const locked = ensureChampion(versionId, step.pick.championId, step.pick.position);
      const nextPick: DraftPickEntry = {
        ...step.pick,
        championId: locked,
        championNameZh: getChampionById(locked)?.nameZh ?? locked,
      };
      return { ...step, pick: nextPick };
    })
    .filter((step): step is DraftStep => step != null)
    .map((step, index) => ({ ...step, index }));

  const fillMissingDraftPicks = (
    side: DraftResult['home'] | DraftResult['away'],
    sideColor: 'blue' | 'red',
    players: Player[],
  ) => {
    for (const player of players) {
      if (pickMap.has(player.id)) {
        continue;
      }
      const championId = ensureChampion(
        versionId,
        packRoleFallback(versionId, player.position),
        player.position,
      );
      const pick: DraftPickEntry = {
        teamId: side.teamId,
        playerId: player.id,
        gamertag: player.gamertag,
        position: player.position,
        championId,
        championNameZh: getChampionById(championId)?.nameZh ?? championId,
        fitScore: 60,
        metaPower: 40,
      };
      side.picks.push(pick);
      pickMap.set(player.id, championId);
      draft.steps.push({
        kind: 'pick',
        side: sideColor,
        teamId: side.teamId,
        pick: { ...pick },
        index: draft.steps.length,
      });
    }
  };
  fillMissingDraftPicks(draft.home, 'blue', homePlayers);
  fillMissingDraftPicks(draft.away, 'red', awayPlayers);

  const toRoster = (players: Player[]): V2RosterPlayer[] =>
    players.map((player) => ({
      playerId: player.id,
      gamertag: player.gamertag,
      position: player.position,
      championId: ensureChampion(
        versionId,
        pickMap.get(player.id) ?? packRoleFallback(versionId, player.position),
        player.position,
      ),
      laning: player.attributes.laning.current,
      mechanics: player.attributes.mechanics.current,
      teamfighting: player.attributes.teamfighting.current,
      gameSense: player.attributes.gameSense.current,
      consistency: player.attributes.consistency.current,
      adaptability: player.attributes.adaptability.current,
    }));

  const resolvedSeed =
    seed ??
    hashSeed(`${input.home.teamId}:${input.away.teamId}:${input.dateIso ?? ''}:${random()}`);

  const v2Input: SimulateV2Input = {
    versionId,
    seed: resolvedSeed,
    blueTeamId: input.home.teamId,
    redTeamId: input.away.teamId,
    blue: toRoster(homePlayers),
    red: toRoster(awayPlayers),
    forceWinnerTeamId: input.forceWinnerTeamId,
    draft: toMatchDraftReport(draft),
  };

  return {
    input: v2Input,
    draft,
    steps: draft.steps,
  };
}

export function buildV2Input(input: SimulateGameInput, seed?: string | number): SimulateV2Input {
  return prepareV2Match(input, seed).input;
}
