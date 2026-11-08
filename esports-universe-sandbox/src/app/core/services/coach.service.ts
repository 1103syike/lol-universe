import { Injectable, computed, inject } from '@angular/core';
import type { Coach, CoachInput } from '../models/coach.model';
import { COACH_ATTRIBUTE_KEYS } from '../models/coach.model';
import type { AttributeKey } from '../models/player.model';
import { ATTRIBUTE_KEYS } from '../models/player.model';
import type { Team } from '../models/team.model';
import { clampRating } from '../../shared/utils/create-default-attributes';
import { createDefaultCoachAttributes } from '../../shared/utils/create-default-coach-attributes';
import { calculateCoachOvr } from '../../shared/utils/player-ovr';
import { isRarity, suggestRarityFromOvr } from '../models/rarity.model';
import { TransferWindowService } from './transfer-window.service';
import { UniverseService } from './universe.service';

@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly universeService = inject(UniverseService);
  private readonly windows = inject(TransferWindowService);

  readonly coaches = computed(() => this.universeService.activeUniverse()?.coaches ?? []);
  readonly teams = computed(() => this.universeService.activeUniverse()?.teams ?? []);

  getCoachById(coachId: string): Coach | null {
    return this.coaches().find((coach) => coach.id === coachId) ?? null;
  }

  getCoachByTeamId(teamId: string): Coach | null {
    return this.coaches().find((coach) => coach.teamId === teamId) ?? null;
  }

  createCoach(input: CoachInput): Coach {
    this.windows.assertOpen();
    const payload = this.normalizeInput(input);
    this.assertUniqueGamertag(payload.gamertag);
    this.assertTeamExists(payload.teamId);

    const now = new Date().toISOString();
    const coach: Coach = {
      id: crypto.randomUUID(),
      displayName: payload.displayName,
      gamertag: payload.gamertag,
      nationality: payload.nationality,
      teamId: payload.teamId,
      birthday: payload.birthday,
      rarity: payload.rarity,
      attributes: payload.attributes,
      specialties: payload.specialties,
      contract: payload.contract,
      careerRecords: [],
      createdAt: now,
      updatedAt: now,
    };

    const coaches = this.applyCoachAssignment([...this.coaches(), coach], coach);
    const teams = this.syncTeamCoaches(this.teams(), coaches);
    this.universeService.patchActiveUniverse({ coaches, teams });

    return coach;
  }

  updateCoach(coachId: string, input: CoachInput): void {
    const current = this.getCoachById(coachId);
    if (!current) {
      throw new Error('找不到教練');
    }

    const payload = this.normalizeInput(input);
    this.assertUniqueGamertag(payload.gamertag, coachId);
    this.assertTeamExists(payload.teamId);
    if (payload.teamId !== current.teamId) {
      this.windows.assertOpen();
    }

    const updated: Coach = {
      ...current,
      displayName: payload.displayName,
      gamertag: payload.gamertag,
      nationality: payload.nationality,
      teamId: payload.teamId,
      birthday: payload.birthday,
      rarity: payload.rarity,
      attributes: payload.attributes,
      specialties: payload.specialties,
      contract: payload.contract,
      updatedAt: new Date().toISOString(),
    };

    const withoutCurrent = this.coaches().map((coach) => (coach.id === coachId ? updated : coach));
    const coaches = this.applyCoachAssignment(withoutCurrent, updated);
    const teams = this.syncTeamCoaches(this.teams(), coaches);
    this.universeService.patchActiveUniverse({ coaches, teams });
  }

  moveCoach(coachId: string, teamId: string | null): void {
    const current = this.getCoachById(coachId);
    if (!current) {
      throw new Error('找不到教練');
    }
    if (current.teamId === teamId) {
      return;
    }
    this.updateCoach(coachId, {
      displayName: current.displayName,
      gamertag: current.gamertag,
      nationality: current.nationality,
      teamId,
      birthday: current.birthday,
      rarity: current.rarity,
      attributes: { ...current.attributes },
      specialties: [...current.specialties],
      contract: { ...current.contract },
    });
  }

  deleteCoach(coachId: string): void {
    const current = this.getCoachById(coachId);
    if (current?.teamId) {
      this.windows.assertOpen();
    }
    const coaches = this.coaches().filter((coach) => coach.id !== coachId);
    const teams = this.syncTeamCoaches(this.teams(), coaches);
    this.universeService.patchActiveUniverse({ coaches, teams });
  }

  private applyCoachAssignment(coaches: Coach[], assigned: Coach): Coach[] {
    if (!assigned.teamId) {
      return coaches;
    }

    return coaches.map((coach) => {
      if (coach.id === assigned.id) {
        return assigned;
      }

      if (coach.teamId === assigned.teamId) {
        return {
          ...coach,
          teamId: null,
          updatedAt: new Date().toISOString(),
        };
      }

      return coach;
    });
  }

  private syncTeamCoaches(teams: Team[], coaches: Coach[]): Team[] {
    return teams.map((team) => {
      const coach = coaches.find((item) => item.teamId === team.id) ?? null;
      const nextCoachId = coach?.id ?? null;

      if (team.coachId === nextCoachId) {
        return team;
      }

      return {
        ...team,
        coachId: nextCoachId,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private normalizeInput(input: CoachInput): CoachInput {
    const gamertag = input.gamertag.trim();
    const displayName = input.displayName.trim() || gamertag;
    const birthday = input.birthday.trim();
    const annualSalary = Number(input.contract.annualSalary);

    if (!gamertag) {
      throw new Error('教練 ID 不可為空');
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

    const sourceAttributes = input.attributes ?? createDefaultCoachAttributes();
    const attributes = createDefaultCoachAttributes();

    for (const key of COACH_ATTRIBUTE_KEYS) {
      attributes[key] = clampRating(sourceAttributes[key] ?? 85);
    }

    const specialties = Array.from(
      new Set(
        (input.specialties ?? []).filter((key): key is AttributeKey =>
          (ATTRIBUTE_KEYS as readonly string[]).includes(key),
        ),
      ),
    );

    const rarity = isRarity(input.rarity)
      ? input.rarity
      : suggestRarityFromOvr(calculateCoachOvr(attributes));

    return {
      displayName,
      gamertag,
      nationality: input.nationality,
      teamId: input.teamId,
      birthday,
      rarity,
      attributes,
      specialties,
      contract: {
        startDate: input.contract.startDate,
        endDate: input.contract.endDate,
        annualSalary: Math.round(annualSalary),
      },
    };
  }

  private assertUniqueGamertag(gamertag: string, excludeCoachId?: string): void {
    const duplicated = this.coaches().some(
      (coach) =>
        coach.gamertag.toLowerCase() === gamertag.toLowerCase() &&
        coach.id !== excludeCoachId,
    );

    if (duplicated) {
      throw new Error('同一宇宙內教練 ID 不可重複');
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
