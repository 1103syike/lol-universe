import type { Player, PlayerPosition } from '../../../core/models/player.model';
import { calculateChemistry } from '../../sim/chemistry';
import { runClassicDraft, type DraftResult } from '../../sim/draft';
import type { SimulateGameInput } from '../../sim/match-engine';
import type { MatchDraftReport } from '../../sim/report';
import type { ChampionMetaEntry, PatchMetaTable } from '../../../core/models/patch.model';
import { resolvePatchMeta, resolvePatchVersion } from '../../sim/resolve-patch';
import { buildTeamProfile } from '../../sim/team-profile';
import type { V2RosterPlayer } from '../champion/spawn';
import type { SimulateV2Input } from '../engine';
import { hashSeed } from '../rng';
import { getVersionPack, listVersionIds } from '../version/registry';

function mergeVersionPatchMeta(base: PatchMetaTable, versionId: string): PatchMetaTable {
  const pack = getVersionPack(versionId);
  const merged: Record<string, ChampionMetaEntry> = { ...base };
  for (const [championId, strength] of Object.entries(pack.patchStrength)) {
    const prev = merged[championId];
    merged[championId] = {
      presence: strength.presence,
      pickRate: prev?.pickRate ?? strength.presence * 0.7,
      banRate: prev?.banRate ?? Math.max(0.02, strength.presence * 0.35),
      winRate: prev?.winRate ?? 0.48 + (strength.power - 50) / 400,
      power: strength.power,
    };
  }
  return merged;
}

const ROLE_FALLBACK: Record<PlayerPosition, string> = {
  TOP: 'Garen',
  JUNGLE: 'LeeSin',
  MID: 'Annie',
  BOT: 'Ashe',
  SUPPORT: 'Thresh',
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
    return ids[0] ?? 'demo-a';
  }
  const year = Number(dateIso.slice(0, 4));
  if (year >= 2024 && ids.includes('demo-b')) {
    return 'demo-b';
  }
  return ids[0] ?? 'demo-a';
}

function ensureChampion(versionId: string, championId: string, position: PlayerPosition): string {
  const pack = getVersionPack(versionId);
  if (pack.champions[championId]) {
    return championId;
  }
  return ROLE_FALLBACK[position];
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
  };
}

export function buildV2Input(input: SimulateGameInput, seed?: string | number): SimulateV2Input {
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
  const draft = runClassicDraft({ home, away, patch, meta, random });
  const pickMap = new Map<string, string>();
  for (const pick of [...draft.home.picks, ...draft.away.picks]) {
    pickMap.set(pick.playerId, pick.championId);
  }

  const toRoster = (players: Player[]): V2RosterPlayer[] =>
    players.map((player) => ({
      playerId: player.id,
      gamertag: player.gamertag,
      position: player.position,
      championId: ensureChampion(
        versionId,
        pickMap.get(player.id) ?? ROLE_FALLBACK[player.position],
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

  return {
    versionId,
    seed: resolvedSeed,
    blueTeamId: input.home.teamId,
    redTeamId: input.away.teamId,
    blue: toRoster(homePlayers),
    red: toRoster(awayPlayers),
    forceWinnerTeamId: input.forceWinnerTeamId,
    draft: toMatchDraftReport(draft),
  };
}
