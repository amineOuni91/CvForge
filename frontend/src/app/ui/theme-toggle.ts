import { Component, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      class="fixed bottom-64 right-3 z-50 rounded-full border border-slate-300 bg-white p-2 text-sm shadow-sm lg:bottom-40 dark:border-slate-600 dark:bg-slate-800"
      [attr.aria-label]="theme.theme() === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'"
      [title]="theme.theme() === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'"
    >
      {{ theme.theme() === 'dark' ? '☀️' : '🌙' }}
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
