import { Injectable, effect, inject } from '@angular/core';
import type { LeagueTier } from '../models/league.model';
import { fixedPromotion } from '../../shared/utils/year-calendar';
import { PromotionBoardService } from './promotion-board.service';
import { SeasonClockService } from './season-clock.service';
import { TeamTimelineService } from './team-timeline.service';
import { UniverseService } from './universe.service';

const SLOT_RULE_LAST_YEAR = 2022;

@Injectable({ providedIn: 'root' })
export class PromotionSlotService {
  private readonly universeService = inject(UniverseService);
  private readonly promotion = inject(PromotionBoardService);
  private readonly timeline = inject(TeamTimelineService);
  private readonly clock = inject(SeasonClockService);

  constructor() {
    effect(() => {
      this.sync();
    });
  }

  private sync(): void {
    const universe = this.universeService.activeUniverse();
    const year = this.clock.year();
    if (!universe || year > SLOT_RULE_LAST_YEAR) {
      return;
    }
    const placed = new Map<string, { tier: LeagueTier; date: string | undefined }>();
    for (const split of ['spring', 'summer'] as const) {
      if (!this.promotion.isDone(split)) {
        continue;
      }
      const date = fixedPromotion(year, split)?.['promo-2'];
      for (const series of this.promotion.bracket(split)) {
        if (series.status !== 'done' || !series.left || !series.right) {
          continue;
        }
        const winner = series.left.isWinner ? series.left : series.right;
        const loser = series.left.isWinner ? series.right : series.left;
        placed.set(winner.teamId, { tier: 'TCS', date });
        placed.set(loser.teamId, { tier: 'TCL', date });
      }
    }
    const changed = universe.teams.filter((team) => {
      const next = placed.get(team.id);
      return Boolean(next && next.tier !== team.leagueTier);
    });
    if (changed.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    this.universeService.patchActiveUniverse({
      teams: universe.teams.map((team) => {
        const next = placed.get(team.id);
        if (!next || next.tier === team.leagueTier) {
          return team;
        }
        return { ...team, leagueTier: next.tier, updatedAt: now };
      }),
    });
    for (const team of changed) {
      const next = placed.get(team.id);
      if (!next) {
        continue;
      }
      this.timeline.recordLeagueChange(team.id, team.leagueTier, next.tier, next.date);
    }
  }
}
