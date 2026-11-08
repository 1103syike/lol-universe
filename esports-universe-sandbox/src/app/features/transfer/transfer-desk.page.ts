import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LEAGUE_TIER_LABELS } from '../../core/models/league.model';
import { PLAYER_POSITION_LABELS } from '../../core/models/player.model';
import type { Player } from '../../core/models/player.model';
import type { Coach } from '../../core/models/coach.model';
import type { Team, TitleSponsorSide } from '../../core/models/team.model';
import { teamDisplayName } from '../../core/models/team.model';
import { CoachService } from '../../core/services/coach.service';
import { PlayerService } from '../../core/services/player.service';
import { TeamService } from '../../core/services/team.service';
import { TransferWindowService } from '../../core/services/transfer-window.service';
import { UniverseService } from '../../core/services/universe.service';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { MenuComponent } from '../../shared/ui/menu/menu.component';
import type { MenuOption } from '../../shared/ui/menu/menu.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { bindPageScene } from '../../shared/utils/bind-page-scene';
import { calculateTeamOvr } from '../../shared/utils/player-ovr';
import { readImageAsDataUrl } from '../../shared/utils/read-image-as-data-url';

type DeskTab = 'players' | 'coaches' | 'teams';
type TeamDialogPane = 'sponsor' | 'rename' | 'acquire' | 'roster';
type RosterMode = 'move' | 'trade';
type MoveAction = 'out' | 'in';

@Component({
  selector: 'app-transfer-desk-page',
  imports: [
    ReactiveFormsModule,
    FlagIconComponent,
    MenuComponent,
    RoleIconComponent,
    TeamLogoComponent,
  ],
  templateUrl: './transfer-desk.page.html',
  styleUrl: './transfer-desk.page.scss',
})
export class TransferDeskPage {
  private readonly playerService = inject(PlayerService);
  private readonly coachService = inject(CoachService);
  private readonly teamService = inject(TeamService);
  private readonly windows = inject(TransferWindowService);
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly leagueLabels = LEAGUE_TIER_LABELS;
  readonly positionLabels = PLAYER_POSITION_LABELS;
  readonly activeUniverse = this.universeService.activeUniverse;
  readonly windowState = computed(() => this.windows.current());
  readonly tab = signal<DeskTab>('players');
  readonly note = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly playerFilter = signal<'ALL' | 'FREE' | string>('ALL');
  readonly playerTarget = signal<Record<string, string>>({});
  readonly coachTarget = signal<Record<string, string>>({});
  readonly editingTeamId = signal('');
  readonly teamPane = signal<TeamDialogPane>('sponsor');
  readonly acquireLogoUrl = signal<string | null>(null);
  readonly rosterMode = signal<RosterMode>('move');
  readonly moveAction = signal<MoveAction>('out');
  readonly selectedOwnPlayerId = signal('');
  readonly moveTarget = signal('');
  readonly incomingPlayerId = signal('');
  readonly tradePartnerTeamId = signal('');
  readonly selectedTradePlayerId = signal('');

  readonly teams = computed(() =>
    this.teamService.teams().slice().sort((left, right) => left.abbreviation.localeCompare(right.abbreviation)),
  );
  readonly tcsTeams = computed(() => this.teams().filter((team) => team.leagueTier === 'TCS'));
  readonly tclTeams = computed(() => this.teams().filter((team) => team.leagueTier === 'TCL'));
  readonly otherTeams = computed(() =>
    this.teams().filter((team) => team.leagueTier !== 'TCS' && team.leagueTier !== 'TCL'),
  );
  readonly editingTeam = computed(() => this.teamService.getTeamById(this.editingTeamId()));
  readonly players = this.playerService.players;
  readonly coaches = this.coachService.coaches;
  readonly displayName = teamDisplayName;

  teamOvr(teamId: string): number {
    return calculateTeamOvr(this.playerService.getPlayersByTeamId(teamId));
  }

  readonly editingRoster = computed(() => {
    const team = this.editingTeam();
    if (!team) {
      return [];
    }
    return this.playerService.getPlayersByTeamId(team.id);
  });

  readonly moveDestinations = computed(() => {
    const teamId = this.editingTeamId();
    return [
      { id: 'free', label: '自由', detail: '解除合約' },
      ...this.teams()
        .filter((team) => team.id !== teamId)
        .map((team) => ({
          id: team.id,
          label: team.abbreviation,
          detail: teamDisplayName(team),
        })),
    ];
  });

  readonly incomingCandidates = computed(() => {
    const teamId = this.editingTeamId();
    return this.players()
      .filter((player) => player.teamId !== teamId)
      .slice()
      .sort((left, right) => {
        const leftFree = left.teamId ? 1 : 0;
        const rightFree = right.teamId ? 1 : 0;
        if (leftFree !== rightFree) {
          return leftFree - rightFree;
        }
        return left.gamertag.localeCompare(right.gamertag, 'zh-Hant');
      })
      .map((player) => ({
        player,
        club: player.teamId
          ? (this.teamService.getTeamById(player.teamId)?.abbreviation ?? '？')
          : '自由',
      }));
  });

  readonly tradePartners = computed(() =>
    this.teams()
      .filter((team) => team.id !== this.editingTeamId())
      .map((team) => ({
        id: team.id,
        label: team.abbreviation,
        detail: teamDisplayName(team),
      })),
  );

  readonly tradePartnerRoster = computed(() => {
    const partnerId = this.tradePartnerTeamId();
    if (!partnerId) {
      return [];
    }
    return this.playerService.getPlayersByTeamId(partnerId);
  });

  readonly filterMenu = computed((): MenuOption[] => [
    { value: 'ALL', label: '全部選手' },
    { value: 'FREE', label: '自由球員' },
    ...this.teams().map((team) => ({ value: team.id, label: team.abbreviation })),
  ]);

  readonly teamMenu = computed((): MenuOption[] => [
    { value: '', label: '目的地…' },
    { value: 'free', label: '自由／空窗' },
    ...this.teams().map((team) => ({
      value: team.id,
      label: `${team.abbreviation} · ${teamDisplayName(team)}`,
    })),
  ]);

  readonly shownPlayers = computed(() => {
    const filter = this.playerFilter();
    return this.players()
      .filter((player) => {
        if (filter === 'ALL') {
          return true;
        }
        if (filter === 'FREE') {
          return !player.teamId;
        }
        return player.teamId === filter;
      })
      .slice()
      .sort((left, right) => left.gamertag.localeCompare(right.gamertag, 'zh-Hant'));
  });

  readonly shownCoaches = computed(() =>
    this.coaches()
      .slice()
      .sort((left, right) => left.gamertag.localeCompare(right.gamertag, 'zh-Hant')),
  );

  readonly feed = computed(() => {
    const universe = this.activeUniverse();
    const window = this.windowState();
    if (!universe || !window.start || !window.end) {
      return [];
    }
    const teamById = new Map(universe.teams.map((team) => [team.id, team]));
    return universe.teamEvents
      .filter((event) => event.date >= window.start && event.date <= window.end)
      .filter(
        (event) =>
          event.kind === 'player-joined' ||
          event.kind === 'acquired' ||
          event.kind === 'renamed' ||
          event.kind === 'sponsored',
      )
      .slice()
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
      .slice(0, 16)
      .map((event) => ({
        id: event.id,
        date: event.date,
        text: event.summary,
        teamAbbr: teamById.get(event.teamId)?.abbreviation ?? '—',
      }));
  });

  readonly sponsorForm = this.formBuilder.nonNullable.group({
    sponsor: ['', [Validators.maxLength(40)]],
    side: ['prefix' as TitleSponsorSide | ''],
  });

  readonly renameForm = this.formBuilder.nonNullable.group({
    abbreviation: ['', [Validators.required, Validators.maxLength(12)]],
    name: ['', [Validators.required, Validators.maxLength(60)]],
  });

  readonly acquireForm = this.formBuilder.nonNullable.group({
    buyer: ['', [Validators.required, Validators.maxLength(40)]],
    abbreviation: ['', [Validators.required, Validators.maxLength(12)]],
    name: ['', [Validators.required, Validators.maxLength(60)]],
  });

  constructor() {
    bindPageScene(inject(DestroyRef), 'transfer', '轉會');
  }

  sponsorPreviewName(): string {
    const team = this.editingTeam();
    if (!team) {
      return '';
    }
    const value = this.sponsorForm.getRawValue();
    const sponsor = value.sponsor.trim();
    const side = value.side === 'prefix' || value.side === 'suffix' ? value.side : null;
    return teamDisplayName({
      name: team.name,
      titleSponsor: sponsor || null,
      titleSponsorSide: sponsor ? side : null,
    });
  }

  setTab(tab: DeskTab): void {
    this.tab.set(tab);
    this.clearMessages();
  }

  setPlayerFilter(value: string | number): void {
    this.playerFilter.set(String(value) as 'ALL' | 'FREE' | string);
  }

  setPlayerTarget(playerId: string, teamId: string | number): void {
    this.playerTarget.update((current) => ({ ...current, [playerId]: String(teamId) }));
  }

  setCoachTarget(coachId: string, teamId: string | number): void {
    this.coachTarget.update((current) => ({ ...current, [coachId]: String(teamId) }));
  }

  teamLabel(teamId: string | null): string {
    if (!teamId) {
      return '自由';
    }
    return this.teamService.getTeamById(teamId)?.abbreviation ?? '已解散';
  }

  movePlayer(player: Player): void {
    if (!this.windowState().isOpen) {
      this.error.set(this.windowState().detail);
      return;
    }
    const choice = this.playerTarget()[player.id] ?? '';
    if (!choice) {
      this.error.set('先選目的地');
      return;
    }
    this.clearMessages();
    try {
      this.playerService.movePlayer(player.id, choice === 'free' ? null : choice);
      this.playerTarget.update((current) => {
        const next = { ...current };
        delete next[player.id];
        return next;
      });
      this.note.set(`${player.gamertag} 已移動`);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '沒移成');
    }
  }

  moveCoach(coach: Coach): void {
    if (!this.windowState().isOpen) {
      this.error.set(this.windowState().detail);
      return;
    }
    const choice = this.coachTarget()[coach.id] ?? '';
    if (!choice) {
      this.error.set('先選目的地');
      return;
    }
    this.clearMessages();
    try {
      this.coachService.moveCoach(coach.id, choice === 'free' ? null : choice);
      this.coachTarget.update((current) => {
        const next = { ...current };
        delete next[coach.id];
        return next;
      });
      this.note.set(`${coach.gamertag} 已指派`);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '沒指派成');
    }
  }

  openTeamDialog(team: Team): void {
    this.editingTeamId.set(team.id);
    this.teamPane.set('sponsor');
    this.acquireLogoUrl.set(null);
    this.resetRosterDraft();
    this.sponsorForm.reset({
      sponsor: team.titleSponsor ?? '',
      side: team.titleSponsorSide ?? 'prefix',
    });
    this.renameForm.reset({
      abbreviation: team.abbreviation,
      name: team.name,
    });
    this.acquireForm.reset({
      buyer: '',
      abbreviation: team.abbreviation,
      name: team.name,
    });
    this.clearMessages();
  }

  closeTeamDialog(): void {
    this.editingTeamId.set('');
    this.teamPane.set('sponsor');
    this.acquireLogoUrl.set(null);
    this.resetRosterDraft();
    this.sponsorForm.reset({ sponsor: '', side: 'prefix' });
    this.renameForm.reset({ abbreviation: '', name: '' });
    this.acquireForm.reset({ buyer: '', abbreviation: '', name: '' });
  }

  setTeamPane(pane: TeamDialogPane): void {
    this.teamPane.set(pane);
    this.clearMessages();
  }

  setRosterMode(mode: RosterMode): void {
    this.rosterMode.set(mode);
    this.moveAction.set('out');
    this.selectedOwnPlayerId.set('');
    this.moveTarget.set('');
    this.incomingPlayerId.set('');
    this.tradePartnerTeamId.set('');
    this.selectedTradePlayerId.set('');
    this.clearMessages();
  }

  setMoveAction(action: MoveAction): void {
    this.moveAction.set(action);
    this.selectedOwnPlayerId.set('');
    this.moveTarget.set('');
    this.incomingPlayerId.set('');
    this.clearMessages();
  }

  selectOwnPlayer(playerId: string): void {
    this.selectedOwnPlayerId.set(playerId === this.selectedOwnPlayerId() ? '' : playerId);
  }

  selectMoveTarget(targetId: string): void {
    this.moveTarget.set(targetId === this.moveTarget() ? '' : targetId);
  }

  selectIncomingPlayer(playerId: string): void {
    this.incomingPlayerId.set(playerId === this.incomingPlayerId() ? '' : playerId);
  }

  selectTradePartner(teamId: string): void {
    if (teamId === this.tradePartnerTeamId()) {
      this.tradePartnerTeamId.set('');
      this.selectedTradePlayerId.set('');
      return;
    }
    this.tradePartnerTeamId.set(teamId);
    this.selectedTradePlayerId.set('');
  }

  selectTradePlayer(playerId: string): void {
    this.selectedTradePlayerId.set(playerId === this.selectedTradePlayerId() ? '' : playerId);
  }

  confirmMoveOut(): void {
    if (!this.ensureWindowOpen()) {
      return;
    }
    const playerId = this.selectedOwnPlayerId();
    const target = this.moveTarget();
    if (!playerId) {
      this.error.set('先選本隊選手');
      return;
    }
    if (!target) {
      this.error.set('先選目的地');
      return;
    }
    const player = this.playerService.getPlayerById(playerId);
    if (!player) {
      this.error.set('找不到選手');
      return;
    }
    this.clearMessages();
    try {
      this.playerService.movePlayer(playerId, target === 'free' ? null : target);
      this.note.set(`${player.gamertag} 已轉出`);
      this.selectedOwnPlayerId.set('');
      this.moveTarget.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '轉出沒成');
    }
  }

  confirmMoveIn(): void {
    if (!this.ensureWindowOpen()) {
      return;
    }
    const team = this.editingTeam();
    const playerId = this.incomingPlayerId();
    if (!team) {
      return;
    }
    if (!playerId) {
      this.error.set('先選要引入的選手');
      return;
    }
    const player = this.playerService.getPlayerById(playerId);
    if (!player) {
      this.error.set('找不到選手');
      return;
    }
    this.clearMessages();
    try {
      this.playerService.movePlayer(playerId, team.id);
      this.note.set(`${player.gamertag} 已加入 ${team.abbreviation}`);
      this.incomingPlayerId.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '引入沒成');
    }
  }

  confirmTrade(): void {
    if (!this.ensureWindowOpen()) {
      return;
    }
    const ourId = this.selectedOwnPlayerId();
    const theirId = this.selectedTradePlayerId();
    if (!ourId) {
      this.error.set('先選本隊選手');
      return;
    }
    if (!theirId) {
      this.error.set('先選對手選手');
      return;
    }
    const ours = this.playerService.getPlayerById(ourId);
    const theirs = this.playerService.getPlayerById(theirId);
    if (!ours || !theirs) {
      this.error.set('找不到交易選手');
      return;
    }
    this.clearMessages();
    try {
      this.playerService.tradePlayers(ourId, theirId);
      this.note.set(`${ours.gamertag} ⇄ ${theirs.gamertag} 一換一完成`);
      this.selectedOwnPlayerId.set('');
      this.selectedTradePlayerId.set('');
      this.tradePartnerTeamId.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '交易沒成');
    }
  }

  private resetRosterDraft(): void {
    this.rosterMode.set('move');
    this.moveAction.set('out');
    this.selectedOwnPlayerId.set('');
    this.moveTarget.set('');
    this.incomingPlayerId.set('');
    this.tradePartnerTeamId.set('');
    this.selectedTradePlayerId.set('');
  }

  setSponsorSide(side: TitleSponsorSide): void {
    this.sponsorForm.controls.side.setValue(side);
  }

  isSponsorSideOn(side: TitleSponsorSide): boolean {
    const value = this.sponsorForm.getRawValue();
    return !!value.sponsor.trim() && value.side === side;
  }

  isSponsorCleared(): boolean {
    return !this.sponsorForm.controls.sponsor.value.trim();
  }

  clearSponsor(): void {
    this.sponsorForm.reset({ sponsor: '', side: 'prefix' });
  }

  saveSponsor(): void {
    if (!this.ensureWindowOpen()) {
      return;
    }
    const team = this.editingTeam();
    if (!team) {
      return;
    }
    const value = this.sponsorForm.getRawValue();
    const sponsor = value.sponsor.trim();
    const side = value.side === 'prefix' || value.side === 'suffix' ? value.side : null;
    if (sponsor && !side) {
      this.error.set('有冠名就要選前綴或後綴');
      return;
    }
    this.clearMessages();
    try {
      this.teamService.setTitleSponsor(team.id, sponsor || null, sponsor ? side : null);
      this.note.set(sponsor ? `冠名已設為 ${this.sponsorPreviewName()}` : '已解除冠名');
      this.closeTeamDialog();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '冠名沒存成');
    }
  }

  saveRename(): void {
    if (!this.ensureWindowOpen()) {
      return;
    }
    const team = this.editingTeam();
    if (!team) {
      return;
    }
    if (this.renameForm.invalid) {
      this.renameForm.markAllAsTouched();
      return;
    }
    const value = this.renameForm.getRawValue();
    this.clearMessages();
    try {
      this.teamService.updateTeam(team.id, {
        abbreviation: value.abbreviation.trim(),
        name: value.name.trim(),
        leagueTier: team.leagueTier,
        salaryCap: team.salaryCap,
        logoUrl: team.logoUrl,
        titleSponsor: team.titleSponsor,
        titleSponsorSide: team.titleSponsorSide,
      });
      this.note.set(`${value.abbreviation} 已更名`);
      this.closeTeamDialog();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '更名沒成');
    }
  }

  async onAcquireLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.clearMessages();
    try {
      this.acquireLogoUrl.set(await readImageAsDataUrl(file));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '隊標讀取失敗');
    }
  }

  saveAcquire(): void {
    if (!this.ensureWindowOpen()) {
      return;
    }
    const team = this.editingTeam();
    if (!team) {
      return;
    }
    if (this.acquireForm.invalid) {
      this.acquireForm.markAllAsTouched();
      return;
    }
    const logoUrl = this.acquireLogoUrl();
    if (!logoUrl) {
      this.error.set('收購必須上傳新隊標');
      return;
    }
    const value = this.acquireForm.getRawValue();
    this.clearMessages();
    try {
      this.teamService.acquireTeam(team.id, {
        buyer: value.buyer.trim(),
        abbreviation: value.abbreviation.trim(),
        name: value.name.trim(),
        logoUrl,
      });
      this.note.set(`${value.abbreviation} 已被 ${value.buyer.trim()} 收購`);
      this.closeTeamDialog();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : '收購沒成');
    }
  }

  private ensureWindowOpen(): boolean {
    if (this.windowState().isOpen) {
      return true;
    }
    this.error.set(this.windowState().detail);
    return false;
  }

  private clearMessages(): void {
    this.note.set(null);
    this.error.set(null);
  }
}
