import { Component, effect, input, signal } from '@angular/core';
import { resolveTeamLogoUrl } from '../../utils/team-logo';

@Component({
  selector: 'app-team-logo',
  templateUrl: './team-logo.component.html',
  styleUrl: './team-logo.component.scss',
})
export class TeamLogoComponent {
  readonly abbreviation = input.required<string>();
  readonly logoUrl = input<string | null>(null);
  readonly name = input('');
  readonly markColor = input('#3b82f6');
  readonly bare = input(false);

  readonly failed = signal(false);
  readonly imageSrc = signal('');

  constructor() {
    effect(() => {
      this.imageSrc.set(resolveTeamLogoUrl(this.logoUrl(), this.abbreviation()));
      this.failed.set(false);
    });
  }

  onImageError(): void {
    this.failed.set(true);
  }
}
