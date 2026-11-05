import { Injectable, computed, inject } from '@angular/core';
import type { Player, PlayerInput } from '../models/player.model';
import type { Team } from '../models/team.model';
import { clampGrowthRate, clampRating, createDefaultAttributes } from '../../shared/utils/create-default-attributes';
import { ATTRIBUTE_KEYS, comparePlayersByRole, isPlayerNationality } from '../models/player.model';
import { UniverseService } from './universe.service';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly universeService = inject(UniverseService);

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
    const payload = this.normalizeInput(input);
    this.assertUniqueGamertag(payload.gamertag);
    this.assertTeamExists(payload.teamId);

    const now = new Date().toISOString();
    const player: Player = {
      id: crypto.randomUUID(),
      displayName: payload.displayName,
      gamertag: payload.gamertag,
      nationality: payload.nationality,
      position: payload.position,
      teamId: payload.teamId,
      birthday: payload.birthday,
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

    const updated: Player = {
      ...current,
      displayName: payload.displayName,
      gamertag: payload.gamertag,
      nationality: payload.nationality,
      position: payload.position,
      teamId: payload.teamId,
      birthday: payload.birthday,
      attributes: payload.attributes,
      form: payload.form,
      contract: payload.contract,
      updatedAt: new Date().toISOString(),
    };

    const players = this.players().map((player) => (player.id === playerId ? updated : player));
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
  }

  deletePlayer(playerId: string): void {
    const players = this.players().filter((player) => player.id !== playerId);
    const teams = this.syncTeamRosters(this.teams(), players);
    this.universeService.patchActiveUniverse({ players, teams });
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
        current: clampRating(sourceAttributes[key]?.current ?? 70),
        potential: clampRating(sourceAttributes[key]?.potential ?? 80),
        growthRate: clampGrowthRate(sourceAttributes[key]?.growthRate ?? 1),
      };

      if (attributes[key].potential < attributes[key].current) {
        attributes[key].potential = attributes[key].current;
      }
    }

    return {
      displayName,
      gamertag,
      nationality,
      position: input.position,
      teamId: input.teamId,
      birthday,
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
