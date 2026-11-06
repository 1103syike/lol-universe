import { Injectable, computed, inject } from '@angular/core';
import { buildOpeningLeague } from '../data/initial-teams';
import type { Team, TeamInput } from '../models/team.model';
import { defaultTeamLogoUrl } from '../../shared/utils/team-logo';
import { rememberShuffledFixtures } from '../../shared/utils/opening-fixtures';
import { StorageAdapter } from '../storage/storage.adapter';
import { TeamTimelineService } from './team-timeline.service';
import { UniverseService } from './universe.service';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly universeService = inject(UniverseService);
  private readonly timeline = inject(TeamTimelineService);
  private readonly storage = inject(StorageAdapter);

  readonly teams = computed(() => this.universeService.activeUniverse()?.teams ?? []);

  getTeamById(teamId: string): Team | null {
    return this.teams().find((team) => team.id === teamId) ?? null;
  }

  createTeam(input: TeamInput): Team {
    const payload = this.normalizeInput(input);
    this.assertUniqueAbbreviation(payload.abbreviation);

    const now = new Date().toISOString();
    const team: Team = {
      id: crypto.randomUUID(),
      abbreviation: payload.abbreviation,
      name: payload.name,
      leagueTier: payload.leagueTier,
      salaryCap: payload.salaryCap,
      logoUrl: payload.logoUrl ?? defaultTeamLogoUrl(payload.abbreviation),
      coachId: null,
      playerIds: [],
      createdAt: now,
      updatedAt: now,
    };

    this.universeService.replaceActiveUniverseTeams([...this.teams(), team]);
    return team;
  }

  updateTeam(teamId: string, input: TeamInput): void {
    const current = this.getTeamById(teamId);
    if (!current) {
      throw new Error('找不到隊伍');
    }

    const payload = this.normalizeInput(input);
    this.assertUniqueAbbreviation(payload.abbreviation, teamId);

    const updated: Team = {
      ...current,
      abbreviation: payload.abbreviation,
      name: payload.name,
      leagueTier: payload.leagueTier,
      salaryCap: payload.salaryCap,
      logoUrl: payload.logoUrl ?? defaultTeamLogoUrl(payload.abbreviation),
      updatedAt: new Date().toISOString(),
    };

    this.universeService.replaceActiveUniverseTeams(
      this.teams().map((team) => (team.id === teamId ? updated : team)),
    );
    this.timeline.recordRename(teamId, current, payload);
    this.timeline.recordLeagueChange(teamId, current.leagueTier, payload.leagueTier);
  }

  deleteTeam(teamId: string): void {
    this.universeService.replaceActiveUniverseTeams(
      this.teams().filter((team) => team.id !== teamId),
    );
    this.timeline.removeTeam(teamId);
  }

  seedInitialTeams(): void {
    if (this.teams().length > 0) {
      throw new Error('目前宇宙已有隊伍，無法載入初始名單');
    }

    const universe = this.universeService.activeUniverse();
    if (!universe) {
      throw new Error('尚未選擇宇宙');
    }

    const opening = buildOpeningLeague(new Date().toISOString(), universe.startYear);
    this.universeService.patchActiveUniverse({
      teams: opening.teams,
      players: opening.players,
      coaches: opening.coaches,
    });
    rememberShuffledFixtures(this.storage, {
      id: universe.id,
      startYear: universe.startYear,
      teams: opening.teams,
    });
  }

  private normalizeInput(input: TeamInput): TeamInput {
    const abbreviation = input.abbreviation.trim();
    const name = input.name.trim();
    const salaryCap = Number(input.salaryCap);
    const logoUrl = input.logoUrl?.trim() ? input.logoUrl.trim() : null;

    if (!abbreviation) {
      throw new Error('隊伍縮寫不可為空');
    }
    if (!name) {
      throw new Error('隊伍名稱不可為空');
    }
    if (!Number.isFinite(salaryCap) || salaryCap <= 0) {
      throw new Error('工資帽必須大於 0');
    }

    return {
      abbreviation,
      name,
      leagueTier: input.leagueTier,
      salaryCap: Math.round(salaryCap),
      logoUrl,
    };
  }

  private assertUniqueAbbreviation(abbreviation: string, excludeTeamId?: string): void {
    const duplicated = this.teams().some(
      (team) =>
        team.abbreviation.toLowerCase() === abbreviation.toLowerCase() &&
        team.id !== excludeTeamId,
    );

    if (duplicated) {
      throw new Error('同一宇宙內隊伍縮寫不可重複');
    }
  }
}
