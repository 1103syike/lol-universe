import { DatePipe } from '@angular/common';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LEAGUE_TIERS, LEAGUE_TIER_LABELS } from '../../core/models/league.model';
import { PLAYER_POSITION_LABELS } from '../../core/models/player.model';
import type { Player } from '../../core/models/player.model';
import type { LeagueTier } from '../../core/models/league.model';
import { CoachService } from '../../core/services/coach.service';
import { PlayerService } from '../../core/services/player.service';
import { TeamService } from '../../core/services/team.service';
import { TeamTimelineService } from '../../core/services/team-timeline.service';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { readImageAsDataUrl } from '../../shared/utils/read-image-as-data-url';
import { defaultTeamLogoUrl } from '../../shared/utils/team-logo';

@Component({
  selector: 'app-team-detail-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, FlagIconComponent, RoleIconComponent, TeamLogoComponent],
  templateUrl: './team-detail.page.html',
  styleUrl: './team-detail.page.scss',
})
export class TeamDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamService = inject(TeamService);
  private readonly playerService = inject(PlayerService);
  private readonly coachService = inject(CoachService);
  private readonly timelineService = inject(TeamTimelineService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly logoFileInput = viewChild<ElementRef<HTMLInputElement>>('logoFileInput');

  readonly leagueTiers = LEAGUE_TIERS;
  readonly leagueTierLabels = LEAGUE_TIER_LABELS;
  readonly positionLabels = PLAYER_POSITION_LABELS;

  readonly teamId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('teamId') ?? '')),
    { initialValue: '' },
  );
  readonly isEditing = signal(false);
  readonly formError = signal<string | null>(null);
  readonly buyerName = signal('');
  readonly timelineError = signal<string | null>(null);
  readonly rosterError = signal<string | null>(null);
  readonly incomingPlayerId = signal('');
  readonly moveChoice = signal<Record<string, string>>({});

  readonly team = computed(() => this.teamService.getTeamById(this.teamId()));
  readonly timeline = computed(() => this.timelineService.itemsFor(this.teamId()));
  readonly roster = computed(() => this.playerService.getPlayersByTeamId(this.teamId()));
  readonly coach = computed(() => this.coachService.getCoachByTeamId(this.teamId()));
  readonly otherTeams = computed(() =>
    this.teamService.teams()
      .filter((team) => team.id !== this.teamId())
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation)),
  );
  readonly movablePlayers = computed(() =>
    this.playerService.players()
      .filter((player) => player.teamId !== this.teamId())
      .slice()
      .sort((left, right) => left.gamertag.localeCompare(right.gamertag, 'zh-Hant')),
  );

  readonly editForm = this.formBuilder.nonNullable.group({
    abbreviation: ['', [Validators.required, Validators.maxLength(12)]],
    name: ['', [Validators.required, Validators.maxLength(60)]],
    leagueTier: ['TCS' as LeagueTier, Validators.required],
    salaryCap: [1, [Validators.required, Validators.min(1)]],
    logoUrl: [''],
  });

  startEdit(): void {
    const current = this.team();
    if (!current) {
      return;
    }

    this.formError.set(null);
    this.editForm.reset({
      abbreviation: current.abbreviation,
      name: current.name,
      leagueTier: current.leagueTier,
      salaryCap: current.salaryCap,
      logoUrl: current.logoUrl ?? '',
    });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.formError.set(null);
  }

  useDefaultLogo(): void {
    const abbreviation = this.editForm.controls.abbreviation.value.trim();
    if (!abbreviation) {
      return;
    }
    this.editForm.controls.logoUrl.setValue(defaultTeamLogoUrl(abbreviation));
  }

  isUploadedLogo(logoUrl: string | null | undefined): boolean {
    return !!logoUrl?.startsWith('data:image/');
  }

  logoSourceLabel(logoUrl: string | null | undefined): string {
    if (!logoUrl) {
      return '預設路徑';
    }
    if (logoUrl.startsWith('data:image/')) {
      return '已上傳圖片';
    }
    if (logoUrl.startsWith('/team-logos/')) {
      return '本機預設檔';
    }
    return '外部網址';
  }

  openLogoPicker(): void {
    this.logoFileInput()?.nativeElement.click();
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      this.editForm.controls.logoUrl.setValue(dataUrl);
      this.formError.set(null);
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '讀取圖片失敗');
    } finally {
      input.value = '';
    }
  }

  saveEdit(): void {
    this.formError.set(null);

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    try {
      const raw = this.editForm.getRawValue();
      this.teamService.updateTeam(this.teamId(), {
        ...raw,
        logoUrl: raw.logoUrl.trim() ? raw.logoUrl.trim() : null,
      });
      this.isEditing.set(false);
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '更新失敗');
    }
  }

  recordAcquisition(): void {
    this.timelineError.set(null);
    try {
      this.timelineService.recordAcquisition(this.teamId(), this.buyerName());
      this.buyerName.set('');
    } catch (error) {
      this.timelineError.set(error instanceof Error ? error.message : '沒記上');
    }
  }

  deleteTimelineItem(itemId: string): void {
    this.timelineService.deleteItem(itemId);
  }

  teamAbbreviation(teamId: string | null): string {
    if (!teamId) {
      return '自由球員';
    }
    return this.teamService.getTeamById(teamId)?.abbreviation ?? '已解散';
  }

  setMoveChoice(playerId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.moveChoice.update((current) => ({ ...current, [playerId]: value }));
  }

  setIncomingPlayer(event: Event): void {
    this.incomingPlayerId.set((event.target as HTMLSelectElement).value);
    this.rosterError.set(null);
  }

  moveRosterPlayer(player: Player): void {
    const choice = this.moveChoice()[player.id] ?? '';
    if (!choice) {
      this.rosterError.set('先選要去的隊伍');
      return;
    }

    this.rosterError.set(null);
    try {
      this.playerService.movePlayer(player.id, choice === 'free' ? null : choice);
      this.moveChoice.update((current) => {
        const next = { ...current };
        delete next[player.id];
        return next;
      });
    } catch (error) {
      this.rosterError.set(error instanceof Error ? error.message : '沒移成');
    }
  }

  addRosterPlayer(): void {
    const playerId = this.incomingPlayerId();
    if (!playerId) {
      this.rosterError.set('先選要進來的選手');
      return;
    }

    this.rosterError.set(null);
    try {
      this.playerService.movePlayer(playerId, this.teamId());
      this.incomingPlayerId.set('');
    } catch (error) {
      this.rosterError.set(error instanceof Error ? error.message : '沒移成');
    }
  }

  deleteTeam(): void {
    const current = this.team();
    if (!current) {
      return;
    }

    const confirmed = window.confirm(`確定刪除隊伍「${current.name}」？`);
    if (!confirmed) {
      return;
    }

    this.teamService.deleteTeam(current.id);
    void this.router.navigate(['/teams']);
  }
}
