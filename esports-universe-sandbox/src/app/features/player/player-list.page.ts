import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  PLAYER_NATIONALITY_OPTIONS,
  PLAYER_POSITIONS,
  PLAYER_POSITION_LABELS,
  comparePlayersByRole,
} from '../../core/models/player.model';
import type { PlayerNationality, PlayerPosition } from '../../core/models/player.model';
import { MIN_UNIVERSE_START_YEAR } from '../../core/models/universe.model';
import { PlayerService } from '../../core/services/player.service';
import { UniverseService } from '../../core/services/universe.service';
import { createDefaultAttributes } from '../../shared/utils/create-default-attributes';
import {
  birthdayFromYear,
  buildPlayerBirthYears,
  buildPlayerContractYears,
  contractRangeFromYears,
  contractYearLabel,
  defaultPlayerBirthYear,
} from '../../shared/utils/contract-year';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { MenuComponent, yearMenu } from '../../shared/ui/menu/menu.component';
import type { MenuOption } from '../../shared/ui/menu/menu.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { calculateAge } from '../../shared/utils/player-age';

@Component({
  selector: 'app-player-list-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent, MenuComponent, RoleIconComponent],
  templateUrl: './player-list.page.html',
})
export class PlayerListPage {
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
  readonly contractYears = buildPlayerContractYears();
  readonly contractMenu = yearMenu(this.contractYears);
  readonly birthMenu = computed(() => yearMenu(this.birthYears()));
  readonly signTeamMenu = computed((): MenuOption[] => [
    { value: '', label: '自由' },
    ...this.teams().map((team) => ({
      value: team.id,
      label: `${team.abbreviation} · ${team.name}`,
    })),
  ]);
  readonly filterTeamMenu = computed((): MenuOption[] => [
    { value: 'ALL', label: '全部隊伍' },
    { value: 'FREE', label: '自由' },
    ...this.teams().map((team) => ({ value: team.id, label: team.abbreviation })),
  ]);
  readonly birthYears = computed(() => buildPlayerBirthYears(this.universeYear()));
  private readonly gamertagInput = viewChild<ElementRef<HTMLInputElement>>('gamertagInput');

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly players = this.playerService.players;
  readonly teams = this.playerService.teams;
  readonly selectedPosition = signal<PlayerPosition | 'ALL'>('ALL');
  readonly selectedTeamId = signal<string | 'ALL' | 'FREE'>('ALL');
  readonly isSigning = signal(false);
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
    teamId: [this.rememberedTeamId()],
    birthdayYear: [defaultPlayerBirthYear(this.universeYear()), Validators.required],
    contractYear: [2021, Validators.required],
    expiryYear: [2021, Validators.required],
  });

  constructor() {
    this.createForm.controls.teamId.valueChanges.pipe(takeUntilDestroyed()).subscribe((teamId) => {
      this.rememberTeam(teamId);
    });

    effect(() => {
      const universeId = this.universeService.activeUniverseId();
      const known = new Set(this.playerService.teams().map((team) => team.id));
      const remembered = this.readRememberedTeam(universeId);
      const teamId = remembered && known.has(remembered) ? remembered : '';
      if (this.createForm.controls.teamId.value !== teamId) {
        this.createForm.controls.teamId.setValue(teamId, { emitEvent: false });
      }
    });
  }

  toggleSigning(): void {
    this.isSigning.update((open) => !open);
  }

  setPositionFilter(position: PlayerPosition | 'ALL'): void {
    this.selectedPosition.set(position);
  }

  setTeamFilter(teamId: string | number): void {
    this.selectedTeamId.set(String(teamId) as string | 'ALL' | 'FREE');
  }

  teamName(teamId: string | null): string {
    if (!teamId) {
      return '自由';
    }
    return this.teams().find((team) => team.id === teamId)?.abbreviation ?? '未知隊伍';
  }

  playerAge(birthday: string): number {
    return calculateAge(birthday, this.activeUniverse()?.currentDate ?? '2026-01-01');
  }

  deal(startDate: string, endDate: string): string {
    return contractYearLabel(startDate, endDate);
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
        nationality: raw.nationality,
        position: raw.position,
        teamId: raw.teamId,
        birthdayYear: Number(raw.birthdayYear),
        contractYear: contractYear,
        expiryYear: expiryYear,
      });
      this.gamertagInput()?.nativeElement.focus();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '建立失敗');
    }
  }

  private universeYear(): number {
    const date = this.activeUniverse()?.currentDate ?? '';
    const year = Number(date.slice(0, 4));
    if (Number.isInteger(year) && year >= MIN_UNIVERSE_START_YEAR) {
      return year;
    }
    return new Date().getFullYear();
  }

  private rememberedTeamId(): string {
    const universeId = this.universeService.activeUniverseId();
    const remembered = this.readRememberedTeam(universeId);
    const exists = this.playerService.teams().some((team) => team.id === remembered);
    return exists ? remembered : '';
  }

  private rememberTeam(teamId: string): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    sessionStorage.setItem(this.teamMemoryKey(universeId), teamId);
  }

  private readRememberedTeam(universeId: string | null): string {
    if (!universeId) {
      return '';
    }
    return sessionStorage.getItem(this.teamMemoryKey(universeId)) ?? '';
  }

  private teamMemoryKey(universeId: string): string {
    return `eus.player-form.team.${universeId}`;
  }

  deletePlayer(playerId: string, name: string): void {
    const confirmed = window.confirm(`確定刪除選手「${name}」？`);
    if (!confirmed) {
      return;
    }
    this.playerService.deletePlayer(playerId);
  }
}
