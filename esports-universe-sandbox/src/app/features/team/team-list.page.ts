import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DEFAULT_SALARY_CAP } from '../../core/data/initial-teams';
import { LEAGUE_TIERS, LEAGUE_TIER_LABELS } from '../../core/models/league.model';
import type { LeagueTier } from '../../core/models/league.model';
import { PLAYER_POSITION_LABELS } from '../../core/models/player.model';
import { teamDisplayName } from '../../core/models/team.model';
import { CoachService } from '../../core/services/coach.service';
import { PlayerService } from '../../core/services/player.service';
import { TeamService } from '../../core/services/team.service';
import { TransferWindowService } from '../../core/services/transfer-window.service';
import { UniverseService } from '../../core/services/universe.service';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { MenuComponent } from '../../shared/ui/menu/menu.component';
import type { MenuOption } from '../../shared/ui/menu/menu.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { bindPageScene } from '../../shared/utils/bind-page-scene';
import { calculateCoachOvr, calculatePlayerOvr, calculateTeamOvr } from '../../shared/utils/player-ovr';
import { ratingToGrade } from '../../shared/utils/rating-scale';
import type { RatingGrade } from '../../shared/utils/rating-scale';
import { readImageAsDataUrl } from '../../shared/utils/read-image-as-data-url';
import type { Coach } from '../../core/models/coach.model';
import type { Player } from '../../core/models/player.model';

@Component({
  selector: 'app-team-list-page',
  imports: [ReactiveFormsModule, RouterLink, FlagIconComponent, MenuComponent, RoleIconComponent, TeamLogoComponent],
  templateUrl: './team-list.page.html',
  styleUrl: './team-list.page.scss',
})
export class TeamListPage {
  private readonly teamService = inject(TeamService);
  private readonly windows = inject(TransferWindowService);
  private readonly playerService = inject(PlayerService);
  private readonly coachService = inject(CoachService);
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  constructor() {
    bindPageScene(inject(DestroyRef), 'clubs', '俱樂部');
  }

  readonly windowState = computed(() => this.windows.current());
  readonly leagueTiers = LEAGUE_TIERS;
  readonly leagueTierLabels = LEAGUE_TIER_LABELS;
  readonly leagueMenu: MenuOption[] = LEAGUE_TIERS.map((tier) => ({
    value: tier,
    label: LEAGUE_TIER_LABELS[tier],
  }));
  readonly positionLabels = PLAYER_POSITION_LABELS;
  readonly displayName = teamDisplayName;

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly teams = this.teamService.teams;
  readonly selectedTier = signal<LeagueTier | 'ALL'>('ALL');
  readonly isFounding = signal(false);
  readonly formError = signal<string | null>(null);
  readonly seedMessage = signal<string | null>(null);
  private readonly openRosterIds = signal<ReadonlySet<string>>(new Set());

  readonly allRostersOpen = computed(() => {
    const teams = this.teams();
    if (teams.length === 0) {
      return false;
    }
    const openIds = this.openRosterIds();
    return teams.every((team) => openIds.has(team.id));
  });

  readonly teamSections = computed(() => {
    const selected = this.selectedTier();
    const teams = this.teams();
    const tiers = selected === 'ALL' ? this.leagueTiers : [selected];

    return tiers
      .map((tier) => ({
        tier,
        label: this.leagueTierLabels[tier],
        teams: teams.filter((team) => team.leagueTier === tier),
      }))
      .filter((section) => selected !== 'ALL' || section.teams.length > 0);
  });

  readonly createForm = this.formBuilder.nonNullable.group({
    abbreviation: ['', [Validators.required, Validators.maxLength(12)]],
    name: ['', [Validators.required, Validators.maxLength(60)]],
    leagueTier: ['TCS' as LeagueTier, Validators.required],
    salaryCap: [DEFAULT_SALARY_CAP, [Validators.required, Validators.min(1)]],
    logoUrl: [''],
  });

  toggleFounding(): void {
    this.isFounding.update((open) => !open);
  }

  setTierFilter(tier: LeagueTier | 'ALL'): void {
    this.selectedTier.set(tier);
  }

  createTeam(): void {
    this.formError.set(null);
    this.seedMessage.set(null);

    if (!this.activeUniverse()) {
      this.formError.set('請先選擇宇宙');
      return;
    }

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    try {
      const raw = this.createForm.getRawValue();
      this.teamService.createTeam({
        ...raw,
        logoUrl: raw.logoUrl.trim() ? raw.logoUrl.trim() : null,
      });
      this.createForm.reset({
        abbreviation: '',
        name: '',
        leagueTier: 'TCS',
        salaryCap: DEFAULT_SALARY_CAP,
        logoUrl: '',
      });
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '建立失敗');
    }
  }

  async onCreateLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      this.createForm.controls.logoUrl.setValue(dataUrl);
      this.formError.set(null);
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '讀取圖片失敗');
    }
  }

  seedInitialTeams(): void {
    this.formError.set(null);
    this.seedMessage.set(null);

    try {
      this.teamService.seedInitialTeams();
      this.seedMessage.set('已載入 TCS / TCL 初始隊伍');
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '載入失敗');
    }
  }

  isRosterOpen(teamId: string): boolean {
    return this.openRosterIds().has(teamId);
  }

  toggleAllRosters(): void {
    if (this.allRostersOpen()) {
      this.openRosterIds.set(new Set());
      return;
    }
    this.openRosterIds.set(new Set(this.teams().map((team) => team.id)));
  }

  toggleRoster(teamId: string): void {
    const next = new Set(this.openRosterIds());
    if (next.has(teamId)) {
      next.delete(teamId);
    } else {
      next.add(teamId);
    }
    this.openRosterIds.set(next);
  }

  teamPlayers(teamId: string) {
    return this.playerService.getPlayersByTeamId(teamId);
  }

  teamCoach(teamId: string): Coach | null {
    return this.coachService.getCoachByTeamId(teamId);
  }

  teamGrade(teamId: string): RatingGrade {
    return ratingToGrade(calculateTeamOvr(this.teamPlayers(teamId)));
  }

  playerOvr(player: Player): number {
    return calculatePlayerOvr(player.attributes, player.position);
  }

  coachOvr(coach: Coach): number {
    return calculateCoachOvr(coach.attributes);
  }

  markColor(abbreviation: string): string {
    const palette = ['#d4a017', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#eab308'];
    let hash = 0;
    for (const char of abbreviation) {
      hash = (hash + char.charCodeAt(0) * 17) % palette.length;
    }
    return palette[hash];
  }

  isUploadedLogo(logoUrl: string | null | undefined): boolean {
    return !!logoUrl?.startsWith('data:image/');
  }
}
