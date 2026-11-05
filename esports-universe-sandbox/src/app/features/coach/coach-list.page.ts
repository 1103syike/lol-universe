import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  PLAYER_NATIONALITY_OPTIONS,
  nationalityName,
} from '../../core/models/player.model';
import type { PlayerNationality } from '../../core/models/player.model';
import { buildUniverseStartYears } from '../../core/models/universe.model';
import { CoachService } from '../../core/services/coach.service';
import { UniverseService } from '../../core/services/universe.service';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { birthdayFromYear, buildBirthYears, contractRangeFromYears } from '../../shared/utils/contract-year';
import { createDefaultCoachAttributes } from '../../shared/utils/create-default-coach-attributes';

@Component({
  selector: 'app-coach-list-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent],
  templateUrl: './coach-list.page.html',
  styleUrl: './coach-list.page.scss',
})
export class CoachListPage {
  private readonly coachService = inject(CoachService);
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly nationalityOptions = PLAYER_NATIONALITY_OPTIONS;
  readonly nationalityName = nationalityName;
  readonly birthYears = buildBirthYears(new Date().getFullYear() - 25);
  readonly contractYears = buildUniverseStartYears();

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly coaches = this.coachService.coaches;
  readonly teams = this.coachService.teams;
  readonly selectedTeamId = signal<string | 'ALL' | 'FREE'>('ALL');
  readonly formError = signal<string | null>(null);

  readonly filteredCoaches = computed(() => {
    const teamId = this.selectedTeamId();

    return this.coaches().filter((coach) => {
      return (
        teamId === 'ALL' ||
        (teamId === 'FREE' && !coach.teamId) ||
        coach.teamId === teamId
      );
    });
  });

  readonly createForm = this.formBuilder.nonNullable.group({
    gamertag: ['', [Validators.required, Validators.maxLength(24)]],
    nationality: ['TW' as PlayerNationality, Validators.required],
    teamId: [''],
    birthdayYear: [1988, Validators.required],
    contractYear: [2026, Validators.required],
    expiryYear: [2026, Validators.required],
  });

  setTeamFilter(teamId: string): void {
    this.selectedTeamId.set(teamId as string | 'ALL' | 'FREE');
  }

  teamName(teamId: string | null): string {
    if (!teamId) {
      return '未執教';
    }
    return this.teams().find((team) => team.id === teamId)?.abbreviation ?? '未知隊伍';
  }

  createCoach(): void {
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
      this.coachService.createCoach({
        displayName: raw.gamertag,
        gamertag: raw.gamertag,
        nationality: raw.nationality,
        teamId: raw.teamId || null,
        birthday: birthdayFromYear(Number(raw.birthdayYear)),
        attributes: createDefaultCoachAttributes(72),
        specialties: [],
        contract: {
          startDate: contract.startDate,
          endDate: contract.endDate,
          annualSalary: 3_000_000,
        },
      });

      this.createForm.reset({
        gamertag: '',
        nationality: 'TW',
        teamId: '',
        birthdayYear: 1988,
        contractYear: 2026,
        expiryYear: 2026,
      });
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '建立失敗');
    }
  }

  deleteCoach(coachId: string, name: string): void {
    const confirmed = window.confirm(`確定刪除教練「${name}」？`);
    if (!confirmed) {
      return;
    }
    this.coachService.deleteCoach(coachId);
  }
}
