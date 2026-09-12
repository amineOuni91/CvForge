import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastHost } from './ui/toast';
import { ThemeToggle } from './ui/theme-toggle';
import { HomeButton } from './ui/home-button';

function isHomeUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return path === '/' || path === '/accueil';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost, ThemeToggle, HomeButton],
  template: `
    <router-outlet />
    <app-toast-host />
    @if (!isPrintRoute()) {
      <app-theme-toggle />
      @if (!isHomeRoute()) {
        <app-home-button />
      }
    }
  `,
})
export class App {
  private readonly router = inject(Router);

  readonly isPrintRoute = signal(this.router.url.startsWith('/print'));
  readonly isHomeRoute = signal(isHomeUrl(this.router.url));

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.isPrintRoute.set(e.urlAfterRedirects.startsWith('/print'));
        this.isHomeRoute.set(isHomeUrl(e.urlAfterRedirects));
      }
    });
  }
}
