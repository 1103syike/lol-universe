import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { PlayerNationality } from '../../core/models/player.model';
import {
  PLAYER_NATIONALITY_OPTIONS,
  nationalityName,
} from '../../core/models/player.model';
import { buildUniverseStartYears } from '../../core/models/universe.model';
import { CoachService } from '../../core/services/coach.service';
import {
  birthdayFromYear,
  buildBirthYears,
  contractRangeFromYears,
  contractYearLabel,
  yearOf,
} from '../../shared/utils/contract-year';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { MenuComponent, yearMenu } from '../../shared/ui/menu/menu.component';
import type { MenuOption } from '../../shared/ui/menu/menu.component';

@Component({
  selector: 'app-coach-detail-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent, MenuComponent],
  templateUrl: './coach-detail.page.html',
  styleUrl: './coach-detail.page.scss',
})
export class CoachDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coachService = inject(CoachService);
  private readonly formBuilder = inject(FormBuilder);

  readonly nationMenu: MenuOption[] = PLAYER_NATIONALITY_OPTIONS.map((nation) => ({
    value: nation.code,
    label: nation.name,
  }));
  readonly nationalityName = nationalityName;
  readonly birthYears = buildBirthYears(new Date().getFullYear() - 25);
  readonly contractYears = buildUniverseStartYears();
  readonly yearOf = yearOf;
  readonly contractYearLabel = contractYearLabel;

  readonly coachId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('coachId') ?? '')),
    { initialValue: '' },
  );
  readonly isEditing = signal(false);
  readonly formError = signal<string | null>(null);

  readonly teams = this.coachService.teams;
  readonly yearOptions = yearMenu(this.birthYears);
  readonly contractMenu = yearMenu(this.contractYears);
  readonly teamMenu = computed((): MenuOption[] => [
    { value: '', label: '未執教' },
    ...this.teams().map((team) => ({
      value: team.id,
      label: `${team.abbreviation} · ${team.name}`,
    })),
  ]);
  readonly coach = computed(() => this.coachService.getCoachById(this.coachId()));

  readonly editForm = this.formBuilder.nonNullable.group({
    gamertag: ['', [Validators.required, Validators.maxLength(24)]],
    nationality: ['TW' as PlayerNationality, Validators.required],
    teamId: [''],
    birthdayYear: [1988, Validators.required],
    contractYear: [2026, Validators.required],
    expiryYear: [2026, Validators.required],
  });

  teamName(teamId: string | null): string {
    if (!teamId) {
      return '未執教';
    }
    return this.teams().find((team) => team.id === teamId)?.name ?? '未知隊伍';
  }

  startEdit(): void {
    const current = this.coach();
    if (!current) {
      return;
    }

    this.formError.set(null);
    this.editForm.reset({
      gamertag: current.gamertag,
      nationality: current.nationality,
      teamId: current.teamId ?? '',
      birthdayYear: yearOf(current.birthday),
      contractYear: yearOf(current.contract.startDate),
      expiryYear: yearOf(current.contract.endDate),
    });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.formError.set(null);
  }

  saveEdit(): void {
    this.formError.set(null);

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const current = this.coach();
    if (!current) {
      return;
    }

    const raw = this.editForm.getRawValue();
    const contractYear = Number(raw.contractYear);
    const expiryYear = Number(raw.expiryYear);
    if (expiryYear < contractYear) {
      this.formError.set('到期年份不可早於合約年份');
      return;
    }

    try {
      const contract = contractRangeFromYears(contractYear, expiryYear);
      this.coachService.updateCoach(this.coachId(), {
        displayName: raw.gamertag,
        gamertag: raw.gamertag,
        nationality: raw.nationality,
        teamId: raw.teamId || null,
        birthday: birthdayFromYear(Number(raw.birthdayYear)),
        attributes: current.attributes,
        specialties: current.specialties,
        contract: {
          startDate: contract.startDate,
          endDate: contract.endDate,
          annualSalary: current.contract.annualSalary,
        },
      });
      this.isEditing.set(false);
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '更新失敗');
    }
  }

  deleteCoach(): void {
    const current = this.coach();
    if (!current) {
      return;
    }

    const confirmed = window.confirm(`確定刪除教練「${current.gamertag}」？`);
    if (!confirmed) {
      return;
    }

    this.coachService.deleteCoach(current.id);
    void this.router.navigate(['/coaches']);
  }
}
