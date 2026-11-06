import { Component, computed, inject, signal } from '@angular/core';
import type { MenuOption } from '../../shared/ui/menu/menu.component';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PLAYER_NATIONALITY_OPTIONS } from '../../core/models/player.model';
import type { PlayerNationality } from '../../core/models/player.model';
import { buildUniverseStartYears } from '../../core/models/universe.model';
import { CoachService } from '../../core/services/coach.service';
import { UniverseService } from '../../core/services/universe.service';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { MenuComponent, yearMenu } from '../../shared/ui/menu/menu.component';
import { birthdayFromYear, buildBirthYears, contractRangeFromYears, contractYearLabel } from '../../shared/utils/contract-year';
import { calculateAge } from '../../shared/utils/player-age';
import { createDefaultCoachAttributes } from '../../shared/utils/create-default-coach-attributes';

@Component({
  selector: 'app-coach-list-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent, MenuComponent],
  templateUrl: './coach-list.page.html',
})
export class CoachListPage {
  private readonly coachService = inject(CoachService);
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly nationMenu: MenuOption[] = PLAYER_NATIONALITY_OPTIONS.map((nation) => ({
    value: nation.code,
    label: nation.name,
  }));
  readonly birthYears = buildBirthYears(new Date().getFullYear() - 25);
  readonly contractYears = buildUniverseStartYears();
  readonly yearOptions = yearMenu(this.birthYears);
  readonly contractMenu = yearMenu(this.contractYears);
  readonly signTeamMenu = computed((): MenuOption[] => [
    { value: '', label: '空窗' },
    ...this.teams().map((team) => ({
      value: team.id,
      label: `${team.abbreviation} · ${team.name}`,
    })),
  ]);
  readonly filterTeamMenu = computed((): MenuOption[] => [
    { value: 'ALL', label: '全部隊伍' },
    { value: 'FREE', label: '空窗' },
    ...this.teams().map((team) => ({ value: team.id, label: team.abbreviation })),
  ]);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly coaches = this.coachService.coaches;
  readonly teams = this.coachService.teams;
  readonly selectedTeamId = signal<string | 'ALL' | 'FREE'>('ALL');
  readonly isHiring = signal(false);
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

  toggleHiring(): void {
    this.isHiring.update((open) => !open);
  }

  setTeamFilter(teamId: string | number): void {
    this.selectedTeamId.set(String(teamId) as string | 'ALL' | 'FREE');
  }

  coachAge(birthday: string): number {
    return calculateAge(birthday, this.activeUniverse()?.currentDate ?? '2026-01-01');
  }

  deal(startDate: string, endDate: string): string {
    return contractYearLabel(startDate, endDate);
  }

  teamName(teamId: string | null): string {
    if (!teamId) {
      return '空窗';
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
