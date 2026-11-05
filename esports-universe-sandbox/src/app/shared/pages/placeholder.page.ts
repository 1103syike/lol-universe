import { Component, input } from '@angular/core';

@Component({
  selector: 'app-placeholder-page',
  templateUrl: './placeholder.page.html',
  styleUrl: './placeholder.page.scss',
})
export class PlaceholderPage {
  readonly title = input.required<string>();
  readonly phase = input.required<string>();
  readonly description = input.required<string>();
}
