import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  PLAYER_NATIONALITY_OPTIONS,
  PLAYER_POSITIONS,
  PLAYER_POSITION_LABELS,
  nationalityName,
} from '../../core/models/player.model';
import type { PlayerNationality, PlayerPosition } from '../../core/models/player.model';
import { MIN_UNIVERSE_START_YEAR } from '../../core/models/universe.model';
import { PlayerService } from '../../core/services/player.service';
import { UniverseService } from '../../core/services/universe.service';
import {
  birthdayFromYear,
  buildPlayerBirthYears,
  buildPlayerContractYears,
  contractRangeFromYears,
  contractYearLabel,
  yearOf,
} from '../../shared/utils/contract-year';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { MenuComponent, yearMenu } from '../../shared/ui/menu/menu.component';
import type { MenuOption } from '../../shared/ui/menu/menu.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { calculateAge } from '../../shared/utils/player-age';

@Component({
  selector: 'app-player-detail-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent, MenuComponent, RoleIconComponent],
  templateUrl: './player-detail.page.html',
  styleUrl: './player-detail.page.scss',
})
export class PlayerDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly playerService = inject(PlayerService);
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly positions = PLAYER_POSITIONS;
  readonly positionLabels = PLAYER_POSITION_LABELS;
  readonly nationMenu: MenuOption[] = PLAYER_NATIONALITY_OPTIONS.map((nation) => ({
    value: nation.code,
    label: nation.name,
  }));
  readonly positionMenu: MenuOption[] = PLAYER_POSITIONS.map((position) => ({
    value: position,
    label: PLAYER_POSITION_LABELS[position],
  }));
  readonly nationalityName = nationalityName;
  readonly birthYears = computed(() => {
    const years = buildPlayerBirthYears(this.universeYear());
    const current = yearOf(this.player()?.birthday ?? '');
    if (current > 0 && !years.includes(current)) {
      return [...years, current].sort((left, right) => left - right);
    }
    return years;
  });
  readonly contractYears = computed(() => {
    const years = buildPlayerContractYears();
    const contract = this.player()?.contract;
    const extra = [yearOf(contract?.startDate ?? ''), yearOf(contract?.endDate ?? '')].filter(
      (year) => year > 0 && !years.includes(year),
    );
    return [...years, ...extra].sort((left, right) => left - right);
  });
  readonly yearOf = yearOf;
  readonly contractYearLabel = contractYearLabel;

  readonly playerId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('playerId') ?? '')),
    { initialValue: '' },
  );
  readonly isEditing = signal(false);
  readonly formError = signal<string | null>(null);

  readonly teams = this.playerService.teams;
  readonly birthMenu = computed(() => yearMenu(this.birthYears()));
  readonly contractMenu = computed(() => yearMenu(this.contractYears()));
  readonly teamMenu = computed((): MenuOption[] => [
    { value: '', label: '自由球員' },
    ...this.teams().map((team) => ({
      value: team.id,
      label: `${team.abbreviation} · ${team.name}`,
    })),
  ]);
  readonly currentDate = computed(() => this.universeService.activeUniverse()?.currentDate ?? '2026-01-01');
  readonly player = computed(() => this.playerService.getPlayerById(this.playerId()));
  readonly age = computed(() => {
    const current = this.player();
    return current ? calculateAge(current.birthday, this.currentDate()) : 0;
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    gamertag: ['', [Validators.required, Validators.maxLength(24)]],
    nationality: ['TW' as PlayerNationality, Validators.required],
    position: ['MID' as PlayerPosition, Validators.required],
    teamId: [''],
    birthdayYear: [2004, Validators.required],
    contractYear: [2026, Validators.required],
    expiryYear: [2026, Validators.required],
  });

  teamName(teamId: string | null): string {
    if (!teamId) {
      return '自由球員';
    }
    return this.teams().find((team) => team.id === teamId)?.name ?? '未知隊伍';
  }

  startEdit(): void {
    const current = this.player();
    if (!current) {
      return;
    }

    this.formError.set(null);
    this.editForm.reset({
      gamertag: current.gamertag,
      nationality: current.nationality,
      position: current.position,
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

    const current = this.player();
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
      this.playerService.updatePlayer(this.playerId(), {
        displayName: raw.gamertag,
        gamertag: raw.gamertag,
        nationality: raw.nationality,
        position: raw.position,
        teamId: raw.teamId || null,
        birthday: birthdayFromYear(Number(raw.birthdayYear)),
        attributes: current.attributes,
        form: current.form,
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

  private universeYear(): number {
    const date = this.universeService.activeUniverse()?.currentDate ?? '';
    const year = Number(date.slice(0, 4));
    if (Number.isInteger(year) && year >= MIN_UNIVERSE_START_YEAR) {
      return year;
    }
    return new Date().getFullYear();
  }

  deletePlayer(): void {
    const current = this.player();
    if (!current) {
      return;
    }

    const confirmed = window.confirm(`確定刪除選手「${current.gamertag}」？`);
    if (!confirmed) {
      return;
    }

    this.playerService.deletePlayer(current.id);
    void this.router.navigate(['/players']);
  }
}
