import { Routes } from '@angular/router';
import { LayoutComponent } from './shell/layout/layout.component';
import { PlaceholderPage } from './shared/pages/placeholder.page';

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
      },
      {
        path: 'leagues/tcs-double',
        loadComponent: () =>
          import('./features/playoff/double-elim-board.page').then((m) => m.DoubleElimBoardPage),
      },
      {
        path: 'leagues/qualifier/:formatId',
        loadComponent: () =>
          import('./features/playoff/qualifier-board.page').then((m) => m.QualifierBoardPage),
      },
      {
        path: 'matches',
        component: PlaceholderPage,
        data: {
          title: '比賽模擬',
          phase: 'Phase 8',
          description: '此頁面預留給比賽模擬與比分操作，尚未開放。',
        },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
