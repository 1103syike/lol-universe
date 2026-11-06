import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import type { OnInit } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

export interface MenuOption {
  value: string | number;
  label: string;
}

export function yearMenu(years: readonly number[]): MenuOption[] {
  return years.map((year) => ({ value: year, label: String(year) }));
}

function sameMenuValue(left: string | number | null, right: string | number | null): boolean {
  return left === right || String(left) === String(right);
}

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MenuComponent),
      multi: true,
    },
  ],
  host: {
    '[class.menu--lane]': 'variant() === "lane"',
    '[class.menu--nav]': 'variant() === "nav"',
    '[class.is-open]': 'isOpen()',
    '[class.opens-up]': 'opensUp()',
  },
})
export class MenuComponent implements OnInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly rows = viewChildren<ElementRef<HTMLButtonElement>>('row');
  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private formAttached = false;

  readonly options = input.required<readonly MenuOption[]>();
  readonly variant = input<'field' | 'lane' | 'nav'>('field');
  readonly ariaLabel = input('');
  readonly value = input<string | number | null>(null);
  readonly picked = output<string | number>();

  readonly isOpen = signal(false);
  readonly opensUp = signal(false);
  readonly isDisabled = signal(false);
  readonly hotIndex = signal(0);
  private readonly selected = signal<string | number | null>(null);

  readonly currentLabel = computed(() => {
    const match = this.options().find((option) => sameMenuValue(option.value, this.selected()));
    return match?.label ?? '選擇';
  });

  constructor() {
    effect(() => {
      const incoming = this.value();
      if (!this.formAttached) {
        this.selected.set(incoming);
      }
    });
  }

  ngOnInit(): void {
    if (!this.formAttached) {
      this.selected.set(this.value());
    }
  }

  writeValue(value: string | number | null): void {
    this.formAttached = true;
    this.selected.set(value);
  }

  registerOnChange(onChange: (value: string | number | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  isSelected(option: MenuOption): boolean {
    return sameMenuValue(option.value, this.selected());
  }

  toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.open();
  }

  choose(option: MenuOption): void {
    this.selected.set(option.value);
    this.onChange(option.value);
    this.picked.emit(option.value);
    this.close();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    if (!this.isOpen()) {
      this.open();
      return;
    }
    this.move(event.key === 'ArrowDown' ? 1 : -1);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private open(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    this.opensUp.set(spaceBelow < 240 && rect.top > spaceBelow);
    const index = this.options().findIndex((option) => this.isSelected(option));
    this.hotIndex.set(index < 0 ? 0 : index);
    this.isOpen.set(true);
    setTimeout(() => this.focusHot());
  }

  private close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.onTouched();
  }

  private move(step: number): void {
    const count = this.options().length;
    if (count === 0) {
      return;
    }
    const next = (this.hotIndex() + step + count) % count;
    this.hotIndex.set(next);
    setTimeout(() => this.focusHot());
  }

  private focusHot(): void {
    const row = this.rows()[this.hotIndex()]?.nativeElement;
    row?.focus();
    row?.scrollIntoView({ block: 'nearest' });
  }
}
