import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UniverseService } from '../../core/services/universe.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly universeService = inject(UniverseService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly universes = this.universeService.universes;
}
