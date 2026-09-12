import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastHost } from './ui/toast';
import { ThemeToggle } from './ui/theme-toggle';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost, ThemeToggle],
  template: `
    <router-outlet />
    <app-toast-host />
    @if (!isPrintRoute()) {
      <app-theme-toggle />
    }
  `,
})
export class App {
  private readonly router = inject(Router);

  readonly isPrintRoute = signal(this.router.url.startsWith('/print'));

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) this.isPrintRoute.set(e.urlAfterRedirects.startsWith('/print'));
    });
  }
}
