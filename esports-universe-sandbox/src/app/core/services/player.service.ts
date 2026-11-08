import { Injectable, computed, inject } from '@angular/core';
import type { Player, PlayerInput } from '../models/player.model';
import type { Team } from '../models/team.model';
import { clampGrowthRate, clampRating, createDefaultAttributes } from '../../shared/utils/create-default-attributes';
import { ATTRIBUTE_KEYS, comparePlayersByRole, isPlayerNationality } from '../models/player.model';
import { isRarity, suggestRarityFromOvr } from '../models/rarity.model';
import { calculatePlayerOvr } from '../../shared/utils/player-ovr';
import { TeamTimelineService } from './team-timeline.service';
import { TransferWindowService } from './transfer-window.service';
import { UniverseService } from './universe.service';

const MAX_PLAYERS_PER_TEAM = 7;

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly universeService = inject(UniverseService);
  private readonly timeline = inject(TeamTimelineService);
  private readonly windows = inject(TransferWindowService);

  readonly players = computed(() => this.universeService.activeUniverse()?.players ?? []);
  readonly teams = computed(() => this.universeService.activeUniverse()?.teams ?? []);

  getPlayerById(playerId: string): Player | null {
    return this.players().find((player) => player.id === playerId) ?? null;
  }

  getPlayersByTeamId(teamId: string): Player[] {
    return this.players()
      .filter((player) => player.teamId === teamId)
      .slice()
      .sort(comparePlayersByRole);
  }

  createPlayer(input: PlayerInput): Player {
    this.windows.assertOpen();
    const payload = this.normalizeInput(input);
    this.assertUniqueGamertag(payload.gamertag);
    this.assertTeamExists(payload.teamId);
    this.assertRosterHasRoom(payload.teamId);

    const now = new Date().toISOString();
    const player: Player = {
      id: crypto.randomUUID(),
      displayName: payload.displayName,
      gamertag: payload.gamertag,
      nationality: payload.nationality,
      position: payload.position,
      teamId: payload.teamId,
      birthday: payload.birthday,
      rarity: payload.rarity,
      attributes: payload.attributes,
      form: payload.form,
      contract: payload.contract,
      careerRecords: [],
      createdAt: now,
      updatedAt: now,
    };

    const players = [...this.players(), player];
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
    this.timeline.recordPlayerMove({
      playerId: player.id,
      gamertag: player.gamertag,
      fromTeamId: null,
      toTeamId: player.teamId,
    });

    return player;
  }

  updatePlayer(playerId: string, input: PlayerInput): void {
    const current = this.getPlayerById(playerId);
    if (!current) {
      throw new Error('找不到選手');
    }

    const payload = this.normalizeInput(input);
    this.assertUniqueGamertag(payload.gamertag, playerId);
    this.assertTeamExists(payload.teamId);
    if (payload.teamId !== current.teamId) {
      this.windows.assertOpen();
      this.assertRosterHasRoom(payload.teamId);
    }

    const updated: Player = {
      ...current,
      displayName: payload.displayName,
      gamertag: payload.gamertag,
      nationality: payload.nationality,
      position: payload.position,
      teamId: payload.teamId,
      birthday: payload.birthday,
      rarity: payload.rarity,
      attributes: payload.attributes,
      form: payload.form,
      contract: payload.contract,
      updatedAt: new Date().toISOString(),
    };

    const players = this.players().map((player) => (player.id === playerId ? updated : player));
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
    this.timeline.recordPlayerMove({
      playerId,
      gamertag: updated.gamertag,
      fromTeamId: current.teamId,
      toTeamId: updated.teamId,
    });
  }

  movePlayer(playerId: string, teamId: string | null): void {
    const current = this.getPlayerById(playerId);
    if (!current) {
      throw new Error('找不到選手');
    }
    this.assertTeamExists(teamId);
    if (current.teamId === teamId) {
      return;
    }
    this.windows.assertOpen();
    this.assertRosterHasRoom(teamId);

    const updated: Player = {
      ...current,
      teamId,
      updatedAt: new Date().toISOString(),
    };
    const players = this.players().map((player) => (player.id === playerId ? updated : player));
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
    this.timeline.recordPlayerMove({
      playerId,
      gamertag: updated.gamertag,
      fromTeamId: current.teamId,
      toTeamId: teamId,
    });
  }

  tradePlayers(ourPlayerId: string, theirPlayerId: string): void {
    const ours = this.getPlayerById(ourPlayerId);
    const theirs = this.getPlayerById(theirPlayerId);
    if (!ours || !theirs) {
      throw new Error('找不到交易選手');
    }
    if (!ours.teamId || !theirs.teamId) {
      throw new Error('交易雙方都要有所屬隊伍');
    }
    if (ours.id === theirs.id) {
      throw new Error('不能拿同一人交易');
    }
    if (ours.teamId === theirs.teamId) {
      throw new Error('同隊選手不能互交易');
    }
    this.windows.assertOpen();

    const ourTeamId = ours.teamId;
    const theirTeamId = theirs.teamId;
    const now = new Date().toISOString();
    const players = this.players().map((player) => {
      if (player.id === ours.id) {
        return { ...player, teamId: theirTeamId, updatedAt: now };
      }
      if (player.id === theirs.id) {
        return { ...player, teamId: ourTeamId, updatedAt: now };
      }
      return player;
    });
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
    this.timeline.recordPlayerMove({
      playerId: ours.id,
      gamertag: ours.gamertag,
      fromTeamId: ourTeamId,
      toTeamId: theirTeamId,
      leftDetail: `，與 ${theirs.gamertag} 一換一`,
    });
    this.timeline.recordPlayerMove({
      playerId: theirs.id,
      gamertag: theirs.gamertag,
      fromTeamId: theirTeamId,
      toTeamId: ourTeamId,
      leftDetail: `，與 ${ours.gamertag} 一換一`,
    });
  }

  deletePlayer(playerId: string): void {
    const current = this.getPlayerById(playerId);
    if (current?.teamId) {
      this.windows.assertOpen();
    }
    const players = this.players().filter((player) => player.id !== playerId);
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
    if (current?.teamId) {
      this.timeline.recordPlayerMove({
        playerId,
        gamertag: current.gamertag,
        fromTeamId: current.teamId,
        toTeamId: null,
        leftDetail: '，選手資料已刪除',
      });
    }
  }

  private syncTeamRosters(teams: Team[], players: Player[]): Team[] {
    return teams.map((team) => ({
      ...team,
      playerIds: players.filter((player) => player.teamId === team.id).map((player) => player.id),
      updatedAt: new Date().toISOString(),
    }));
  }

  private normalizeInput(input: PlayerInput): PlayerInput {
    const gamertag = input.gamertag.trim();
    const displayName = input.displayName.trim() || gamertag;
    const nationality = input.nationality.trim().toUpperCase();
    const birthday = input.birthday.trim();
    const annualSalary = Number(input.contract.annualSalary);
    const form = clampRating(Number(input.form));

    if (!gamertag) {
      throw new Error('選手 ID 不可為空');
    }
    if (!isPlayerNationality(nationality)) {
      throw new Error('請選擇有效國籍');
    }
    if (!birthday) {
      throw new Error('生日不可為空');
    }
    if (!input.contract.startDate || !input.contract.endDate) {
      throw new Error('合約期間不完整');
    }
    if (!Number.isFinite(annualSalary) || annualSalary < 0) {
      throw new Error('年薪不可為負數');
    }

    const sourceAttributes = input.attributes ?? createDefaultAttributes();
    const attributes = createDefaultAttributes();

    for (const key of ATTRIBUTE_KEYS) {
      attributes[key] = {
        current: clampRating(sourceAttributes[key]?.current ?? 85),
        potential: clampRating(sourceAttributes[key]?.potential ?? 97),
        growthRate: clampGrowthRate(sourceAttributes[key]?.growthRate ?? 1),
      };

      if (attributes[key].potential < attributes[key].current) {
        attributes[key].potential = attributes[key].current;
      }
    }

    const rarity = isRarity(input.rarity)
      ? input.rarity
      : suggestRarityFromOvr(calculatePlayerOvr(attributes, input.position));

    return {
      displayName,
      gamertag,
      nationality,
      position: input.position,
      teamId: input.teamId,
      birthday,
      rarity,
      attributes,
      form,
      contract: {
        startDate: input.contract.startDate,
        endDate: input.contract.endDate,
        annualSalary: Math.round(annualSalary),
      },
    };
  }

  private assertUniqueGamertag(gamertag: string, excludePlayerId?: string): void {
    const duplicated = this.players().some(
      (player) =>
        player.gamertag.toLowerCase() === gamertag.toLowerCase() &&
        player.id !== excludePlayerId,
    );

    if (duplicated) {
      throw new Error('同一宇宙內選手 ID 不可重複');
    }
  }

  private assertRosterHasRoom(teamId: string | null): void {
    if (!teamId) {
      return;
    }
    const count = this.players().filter((player) => player.teamId === teamId).length;
    if (count >= MAX_PLAYERS_PER_TEAM) {
      throw new Error('一隊最多 7 名選手');
    }
  }

  private assertTeamExists(teamId: string | null): void {
    if (!teamId) {
      return;
    }

    const exists = this.teams().some((team) => team.id === teamId);
    if (!exists) {
      throw new Error('指定的隊伍不存在');
    }
  }
}
