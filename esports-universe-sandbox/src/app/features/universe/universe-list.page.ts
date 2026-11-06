import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MIN_UNIVERSE_START_YEAR,
  buildUniverseStartYears,
} from '../../core/models/universe.model';
import { UniverseService } from '../../core/services/universe.service';
import { MenuComponent, yearMenu } from '../../shared/ui/menu/menu.component';

@Component({
  selector: 'app-universe-list-page',
  imports: [DatePipe, ReactiveFormsModule, MenuComponent],
  templateUrl: './universe-list.page.html',
  styleUrl: './universe-list.page.scss',
})
export class UniverseListPage {
  private readonly universeService = inject(UniverseService);
  private readonly formBuilder = inject(FormBuilder);

  readonly universes = this.universeService.universes;
  readonly activeUniverseId = this.universeService.activeUniverseId;
  readonly startYears = buildUniverseStartYears();
  readonly yearOptions = yearMenu(this.startYears);
  readonly editingId = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  readonly createForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    startYear: [2026, [Validators.required, Validators.min(MIN_UNIVERSE_START_YEAR)]],
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    startYear: [2026, [Validators.required, Validators.min(MIN_UNIVERSE_START_YEAR)]],
  });

  createUniverse(): void {
    this.formError.set(null);

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    try {
      const raw = this.createForm.getRawValue();
      this.universeService.createUniverse(raw.name, Number(raw.startYear));
      this.createForm.reset({ name: '', startYear: 2026 });
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '建立失敗');
    }
  }

  startEdit(universeId: string, currentName: string, startYear: number): void {
    this.editingId.set(universeId);
    this.formError.set(null);
    this.editForm.reset({
      name: currentName,
      startYear: startYear || 2026,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm.reset({ name: '', startYear: 2026 });
  }

  saveEdit(universeId: string): void {
    this.formError.set(null);

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    try {
      const raw = this.editForm.getRawValue();
      this.universeService.updateUniverse(universeId, raw.name, Number(raw.startYear));
      this.cancelEdit();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : '更新失敗');
    }
  }

  switchTo(universeId: string): void {
    this.universeService.switchUniverse(universeId);
  }

  duplicate(universeId: string): void {
    this.universeService.duplicateUniverse(universeId);
  }

  remove(universeId: string, name: string): void {
    const confirmed = window.confirm(`確定刪除宇宙「${name}」？此操作無法復原。`);
    if (!confirmed) {
      return;
    }

    if (this.editingId() === universeId) {
      this.cancelEdit();
    }

    this.universeService.deleteUniverse(universeId);
  }
}
