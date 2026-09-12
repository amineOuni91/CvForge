import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastHost } from './ui/toast';
import { ThemeToggle } from './ui/theme-toggle';
import { HomeButton } from './ui/home-button';
import { ConfirmEmailBanner } from './ui/confirm-email-banner';
import { LogoutButton } from './ui/logout-button';
import { AuthService } from './core/auth.service';

function isHomeUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return path === '/' || path === '/accueil';
}

function isConfirmEmailUrl(url: string): boolean {
  return url.split(/[?#]/)[0] === '/confirm-email';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost, ThemeToggle, HomeButton, ConfirmEmailBanner, LogoutButton],
  template: `
    @if (!isPrintRoute() && !isConfirmEmailRoute() && auth.currentUser()?.emailConfirmed === false) {
      <app-confirm-email-banner />
    }
    <router-outlet />
    <app-toast-host />
    @if (!isPrintRoute()) {
      <app-theme-toggle />
      @if (!isHomeRoute()) {
        <app-home-button />
      }
      @if (auth.isAuthenticated()) {
        <app-logout-button />
      }
    }
  `,
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  readonly isPrintRoute = signal(this.router.url.startsWith('/print'));
  readonly isHomeRoute = signal(isHomeUrl(this.router.url));
  readonly isConfirmEmailRoute = signal(isConfirmEmailUrl(this.router.url));

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        this.isPrintRoute.set(e.urlAfterRedirects.startsWith('/print'));
        this.isHomeRoute.set(isHomeUrl(e.urlAfterRedirects));
        this.isConfirmEmailRoute.set(isConfirmEmailUrl(e.urlAfterRedirects));
      }
    });
  }
}
