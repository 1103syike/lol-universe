import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LEAGUE_TIER_LABELS } from '../../core/models/league.model';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  PLAYER_POSITION_LABELS,
} from '../../core/models/player.model';
import type { AttributeKey, Player } from '../../core/models/player.model';
import { teamDisplayName } from '../../core/models/team.model';
import { CoachService } from '../../core/services/coach.service';
import { PlayerService } from '../../core/services/player.service';
import { TeamService } from '../../core/services/team.service';
import { TeamTimelineService } from '../../core/services/team-timeline.service';
import { TransferWindowService } from '../../core/services/transfer-window.service';
import { FlagIconComponent } from '../../shared/ui/flag-icon/flag-icon.component';
import { RarityBadgeComponent } from '../../shared/ui/rarity-badge/rarity-badge.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { MenuComponent } from '../../shared/ui/menu/menu.component';
import type { MenuOption } from '../../shared/ui/menu/menu.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { bindPageScene, paintPageScene } from '../../shared/utils/bind-page-scene';
import { calculateCoachOvr, calculatePlayerOvr, calculateTeamOvr } from '../../shared/utils/player-ovr';
import { ratingToGrade } from '../../shared/utils/rating-scale';
import type { RatingGrade } from '../../shared/utils/rating-scale';
import { resolveTeamLogoUrl } from '../../shared/utils/team-logo';

@Component({
  selector: 'app-team-detail-page',
  imports: [
    DatePipe,
    RouterLink,
    FlagIconComponent,
    MenuComponent,
    RarityBadgeComponent,
    RoleIconComponent,
    TeamLogoComponent,
  ],
  templateUrl: './team-detail.page.html',
  styleUrl: './team-detail.page.scss',
})
export class TeamDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly teamService = inject(TeamService);
  private readonly playerService = inject(PlayerService);
  private readonly coachService = inject(CoachService);
  private readonly timelineService = inject(TeamTimelineService);
  private readonly windows = inject(TransferWindowService);

  constructor() {
    bindPageScene(inject(DestroyRef), 'clubs', '俱樂部');
    effect(() => {
      const current = this.team();
      if (!current) {
        paintPageScene('clubs', '俱樂部');
        return;
      }
      if (current.leagueTier === 'TCS') {
        paintPageScene('tcs', current.abbreviation);
        return;
      }
      if (current.leagueTier === 'TCL') {
        paintPageScene('tcl', current.abbreviation);
        return;
      }
      paintPageScene('clubs', current.abbreviation);
    });
  }

  readonly leagueTierLabels = LEAGUE_TIER_LABELS;
  readonly positionLabels = PLAYER_POSITION_LABELS;
  readonly attributeKeys = ATTRIBUTE_KEYS;
  readonly attributeLabels = ATTRIBUTE_LABELS;
  readonly displayName = teamDisplayName;

  readonly teamId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('teamId') ?? '')),
    { initialValue: '' },
  );
  readonly rosterError = signal<string | null>(null);
  readonly incomingPlayerId = signal('');
  readonly moveChoice = signal<Record<string, string>>({});

  readonly windowState = computed(() => this.windows.current());
  readonly team = computed(() => this.teamService.getTeamById(this.teamId()));
  readonly timeline = computed(() => this.timelineService.itemsFor(this.teamId()));
  readonly roster = computed(() => this.playerService.getPlayersByTeamId(this.teamId()));
  readonly coach = computed(() => this.coachService.getCoachByTeamId(this.teamId()));
  readonly teamOvr = computed(() => calculateTeamOvr(this.roster()));
  readonly coachOvr = computed(() => {
    const current = this.coach();
    return current ? calculateCoachOvr(current.attributes) : null;
  });
  readonly otherTeams = computed(() =>
    this.teamService.teams()
      .filter((team) => team.id !== this.teamId())
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation)),
  );
  readonly incomingMenu = computed((): MenuOption[] => [
    { value: '', label: '移入選手…' },
    ...this.movablePlayers().map((player) => ({
      value: player.id,
      label: `${player.gamertag} · ${this.teamAbbreviation(player.teamId)}`,
    })),
  ]);
  readonly moveMenu = computed((): MenuOption[] => [
    { value: '', label: '移到…' },
    { value: 'free', label: '自由球員' },
    ...this.otherTeams().map((team) => ({ value: team.id, label: team.abbreviation })),
  ]);
  readonly movablePlayers = computed(() =>
    this.playerService.players()
      .filter((player) => player.teamId !== this.teamId())
      .slice()
      .sort((left, right) => left.gamertag.localeCompare(right.gamertag, 'zh-Hant')),
  );

  heroLogoUrl(): string {
    const current = this.team();
    if (!current) {
      return '';
    }
    return resolveTeamLogoUrl(current.logoUrl, current.abbreviation);
  }

  teamAbbreviation(teamId: string | null): string {
    if (!teamId) {
      return '自由球員';
    }
    return this.teamService.getTeamById(teamId)?.abbreviation ?? '已解散';
  }

  playerOvr(player: Player): number {
    return calculatePlayerOvr(player.attributes, player.position);
  }

  playerGrade(player: Player): RatingGrade {
    return ratingToGrade(this.playerOvr(player));
  }

  attrGrade(player: Player, key: AttributeKey): RatingGrade {
    return ratingToGrade(player.attributes[key].current);
  }

  setMoveChoice(playerId: string, teamId: string | number): void {
    this.moveChoice.update((current) => ({ ...current, [playerId]: String(teamId) }));
  }

  setIncomingPlayer(playerId: string | number): void {
    this.incomingPlayerId.set(String(playerId));
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
}
