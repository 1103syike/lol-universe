import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PromotionSlotService } from '../../core/services/promotion-slot.service';
import { TitleHistoryService } from '../../core/services/title-history.service';
import { TopNavComponent } from '../top-nav/top-nav.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, TopNavComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  constructor() {
    inject(PromotionSlotService);
    inject(TitleHistoryService);
  }
}
