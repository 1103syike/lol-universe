import { NgStyle } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { getItemById, itemSpriteStyle, itemTileUrl } from '../../../core/models/item.model';

@Component({
  selector: 'app-item-icon',
  imports: [NgStyle],
  templateUrl: './item-icon.component.html',
  styleUrl: './item-icon.component.scss',
})
export class ItemIconComponent {
  readonly itemId = input.required<string>();
  readonly size = input(22);

  readonly item = computed(() => getItemById(this.itemId()));

  readonly label = computed(() => {
    const item = this.item();
    return item ? `${item.nameZh} · ${item.name}` : this.itemId();
  });

  readonly tileSrc = computed(() => itemTileUrl(this.itemId()));

  readonly spriteStyle = computed(() => itemSpriteStyle(this.itemId(), this.size()));
}
