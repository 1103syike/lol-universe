import { Routes } from '@angular/router';
import { LayoutComponent } from './shell/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'universes',
        loadComponent: () =>
          import('./features/universe/universe-list.page').then((m) => m.UniverseListPage),
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/team/team-list.page').then((m) => m.TeamListPage),
      },
      {
        path: 'teams/:teamId',
        loadComponent: () =>
          import('./features/team/team-detail.page').then((m) => m.TeamDetailPage),
      },
      {
        path: 'players',
        loadComponent: () =>
          import('./features/player/player-list.page').then((m) => m.PlayerListPage),
      },
      {
        path: 'players/:playerId',
        loadComponent: () =>
          import('./features/player/player-detail.page').then((m) => m.PlayerDetailPage),
      },
      {
        path: 'coaches',
        loadComponent: () =>
          import('./features/coach/coach-list.page').then((m) => m.CoachListPage),
      },
      {
        path: 'coaches/:coachId',
        loadComponent: () =>
          import('./features/coach/coach-detail.page').then((m) => m.CoachDetailPage),
      },
      {
        path: 'leagues',
        loadComponent: () =>
          import('./features/league/league-catalog.page').then((m) => m.LeagueCatalogPage),
      },
      {
        path: 'leagues/tcs-single',
        loadComponent: () =>
          import('./features/playoff/playoff-board.page').then((m) => m.PlayoffBoardPage),
        data: { league: 'TCS' },
      },
      {
        path: 'leagues/tcl-single',
        loadComponent: () =>
          import('./features/playoff/playoff-board.page').then((m) => m.PlayoffBoardPage),
        data: { league: 'TCL' },
      },
      {
        path: 'leagues/tcs-double',
        loadComponent: () =>
          import('./features/playoff/double-elim-board.page').then((m) => m.DoubleElimBoardPage),
      },
      {
        path: 'leagues/tcs-hill',
        loadComponent: () =>
          import('./features/playoff/hill-board.page').then((m) => m.HillBoardPage),
      },
      {
        path: 'leagues/retention',
        loadComponent: () =>
          import('./features/playoff/season-board.page').then((m) => m.SeasonBoardPage),
        data: { board: 'retention' },
      },
      {
        path: 'leagues/ea',
        loadComponent: () =>
          import('./features/playoff/season-board.page').then((m) => m.SeasonBoardPage),
        data: { board: 'ea' },
      },
      {
        path: 'leagues/rl',
        loadComponent: () =>
          import('./features/playoff/season-board.page').then((m) => m.SeasonBoardPage),
        data: { board: 'rl' },
      },
      {
        path: 'leagues/rise',
        loadComponent: () =>
          import('./features/playoff/rise-board.page').then((m) => m.RiseBoardPage),
        data: { board: 'rise' },
      },
      {
        path: 'leagues/rise-2026',
        loadComponent: () =>
          import('./features/playoff/rise-board.page').then((m) => m.RiseBoardPage),
        data: { board: 'rise-2026' },
      },
      {
        path: 'leagues/tcs-slot',
        loadComponent: () =>
          import('./features/playoff/rise-board.page').then((m) => m.RiseBoardPage),
        data: { board: 'slot' },
      },
      {
        path: 'leagues/formosa',
        loadComponent: () =>
          import('./features/playoff/formosa-board.page').then((m) => m.FormosaBoardPage),
      },
      {
        path: 'leagues/qualifier/:formatId',
        loadComponent: () =>
          import('./features/playoff/qualifier-board.page').then((m) => m.QualifierBoardPage),
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/schedule/schedule.page').then((m) => m.SchedulePage),
      },
      {
        path: 'matches',
        loadComponent: () => import('./features/match/match-day.page').then((m) => m.MatchDayPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
