import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FORMAT_GROUPS } from '../../core/models/competition-format.model';
import { UniverseService } from '../../core/services/universe.service';

@Component({
  selector: 'app-league-catalog-page',
  imports: [RouterLink],
  templateUrl: './league-catalog.page.html',
  styleUrl: './league-catalog.page.scss',
})
export class LeagueCatalogPage {
  private readonly universeService = inject(UniverseService);

  readonly groups = FORMAT_GROUPS;
  readonly activeUniverse = this.universeService.activeUniverse;
}
