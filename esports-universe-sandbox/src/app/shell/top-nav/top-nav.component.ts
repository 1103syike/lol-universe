import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TransferWindowService } from '../../core/services/transfer-window.service';
import { UniverseService } from '../../core/services/universe.service';
import { MenuComponent } from '../../shared/ui/menu/menu.component';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink, RouterLinkActive, MenuComponent],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TopNavComponent {
  private readonly universeService = inject(UniverseService);
  private readonly windows = inject(TransferWindowService);

  readonly universes = this.universeService.universes;
  readonly activeUniverseId = this.universeService.activeUniverseId;
  readonly hasUniverses = this.universeService.hasUniverses;
  readonly universeMenu = computed(() =>
    this.universes().map((item) => ({ value: item.id, label: item.name })),
  );
  readonly transferPulse = computed(() => {
    this.universeService.activeUniverse();
    const window = this.windows.current();
    return window.isOpen ? window : null;
  });

  readonly playItem: NavItem = { label: '總覽', path: '/dashboard' };
  readonly clubItems: NavItem[] = [
    { label: '隊伍', path: '/teams' },
    { label: '選手', path: '/players' },
    { label: '教練', path: '/coaches' },
    { label: '英雄', path: '/champions' },
  ];
  readonly seasonItems: NavItem[] = [
    { label: '日程', path: '/schedule' },
    { label: '比賽', path: '/matches' },
    { label: '數據庫', path: '/stats' },
  ];

  switchUniverse(universeId: string | number): void {
    const id = String(universeId);
    if (!id) {
      return;
    }
    this.universeService.switchUniverse(id);
  }
}
