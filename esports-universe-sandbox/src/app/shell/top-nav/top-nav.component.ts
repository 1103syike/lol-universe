import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UniverseService } from '../../core/services/universe.service';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TopNavComponent {
  private readonly universeService = inject(UniverseService);

  readonly universes = this.universeService.universes;
  readonly activeUniverseId = this.universeService.activeUniverseId;
  readonly hasUniverses = this.universeService.hasUniverses;

  readonly playItem: NavItem = { label: '總覽', path: '/dashboard' };
  readonly clubItems: NavItem[] = [
    { label: '隊伍', path: '/teams' },
    { label: '選手', path: '/players' },
    { label: '教練', path: '/coaches' },
  ];
  readonly seasonItems: NavItem[] = [
    { label: '聯賽', path: '/leagues' },
    { label: '日程', path: '/schedule' },
    { label: '比賽', path: '/matches' },
  ];

  onUniverseChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const universeId = select.value;
    if (!universeId) {
      return;
    }
    this.universeService.switchUniverse(universeId);
  }
}
