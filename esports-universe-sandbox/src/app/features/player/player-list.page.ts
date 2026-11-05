import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  PLAYER_NATIONALITY_OPTIONS,
  PLAYER_POSITIONS,
  PLAYER_POSITION_LABELS,
  comparePlayersByRole,
  nationalityName,
} from '../../core/models/player.model';
import type { PlayerNationality, PlayerPosition } from '../../core/models/player.model';
import { PlayerService } from '../../core/services/player.service';
import { UniverseService } from '../../core/services/universe.service';
import { buildUniverseStartYears } from '../../core/models/universe.model';
import { createDefaultAttributes } from '../../shared/utils/create-default-attributes';
import { birthdayFromYear, buildBirthYears, contractRangeFromYears } from '../../shared/utils/contract-year';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { calculateAge } from '../../shared/utils/player-age';

@Component({
  selector: 'app-player-list-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent, RoleIconComponent],
  templateUrl: './player-list.page.html',
  styleUrl: './player-list.page.scss',
})
export class PlayerListPage {
  private readonly playerService = inject(PlayerService);
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly positions = PLAYER_POSITIONS;
  readonly positionLabels = PLAYER_POSITION_LABELS;
  readonly nationalityOptions = PLAYER_NATIONALITY_OPTIONS;
  readonly nationalityName = nationalityName;
  readonly birthYears = buildBirthYears();
  readonly contractYears = buildUniverseStartYears();

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly players = this.playerService.players;
  readonly teams = this.playerService.teams;
  readonly selectedPosition = signal<PlayerPosition | 'ALL'>('ALL');
  readonly selectedTeamId = signal<string | 'ALL' | 'FREE'>('ALL');
  readonly formError = signal<string | null>(null);

  readonly filteredPlayers = computed(() => {
    const position = this.selectedPosition();
    const teamId = this.selectedTeamId();

    return this.players()
      .filter((player) => {
        const matchPosition = position === 'ALL' || player.position === position;
        const matchTeam =
          teamId === 'ALL' ||
          (teamId === 'FREE' && !player.teamId) ||
          player.teamId === teamId;
        return matchPosition && matchTeam;
      })
      .slice()
      .sort(comparePlayersByRole);
  });

  readonly createForm = this.formBuilder.nonNullable.group({
    gamertag: ['', [Validators.required, Validators.maxLength(24)]],
    nationality: ['TW' as PlayerNationality, Validators.required],
    position: ['MID' as PlayerPosition, Validators.required],
    teamId: [''],
    birthdayYear: [2004, Validators.required],
    contractYear: [2026, Validators.required],
    expiryYear: [2026, Validators.required],
  });

  setPositionFilter(position: PlayerPosition | 'ALL'): void {
    this.selectedPosition.set(position);
  }

  setTeamFilter(teamId: string): void {
    this.selectedTeamId.set(teamId as string | 'ALL' | 'FREE');
  }

  teamName(teamId: string | null): string {
    if (!teamId) {
      return '自由球員';
    }
    return this.teams().find((team) => team.id === teamId)?.abbreviation ?? '未知隊伍';
  }

  playerAge(birthday: string): number {
    return calculateAge(birthday, this.activeUniverse()?.currentDate ?? '2026-01-01');
  }

  createPlayer(): void {
    this.formError.set(null);

    if (!this.activeUniverse()) {
      this.formError.set('請先選擇宇宙');
      return;
    }

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const raw = this.createForm.getRawValue();
    const contractYear = Number(raw.contractYear);
    const expiryYear = Number(raw.expiryYear);
    if (expiryYear < contractYear) {
      this.formError.set('到期年份不可早於合約年份');
      return;
    }

    try {
      const contract = contractRangeFromYears(contractYear, expiryYear);
      this.playerService.createPlayer({
        displayName: raw.gamertag,
        gamertag: raw.gamertag,
        nationality: raw.nationality,
        position: raw.position,
        teamId: raw.teamId || null,
        birthday: birthdayFromYear(Number(raw.birthdayYear)),
        attributes: createDefaultAttributes(72),
        form: 50,
        contract: {
          startDate: contract.startDate,
          endDate: contract.endDate,
          annualSalary: 2_000_000,
        },
      });

      this.createForm.reset({
        gamertag: '',
        nationality: 'TW',
        position: 'MID',
        teamId: '',
        birthdayYear: 2004,
        contractYear: 2026,
        expiryYear: 2026,
      });
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '建立失敗');
    }
  }

  deletePlayer(playerId: string, name: string): void {
    const confirmed = window.confirm(`確定刪除選手「${name}」？`);
    if (!confirmed) {
      return;
    }
    this.playerService.deletePlayer(playerId);
  }
}
