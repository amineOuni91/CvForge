import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Modal } from './modal';

@Component({
  selector: 'app-logout-button',
  imports: [Modal],
  template: `
    <button
      type="button"
      (click)="confirming.set(true)"
      class="fixed bottom-32 left-3 z-50 rounded-full border border-slate-300 bg-white p-2 text-sm shadow-sm lg:bottom-16 dark:border-slate-600 dark:bg-slate-800"
      aria-label="Se déconnecter"
      title="Se déconnecter"
    >
      🚪
    </button>

    @if (confirming()) {
      <app-modal (close)="confirming.set(false)">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Se déconnecter ?</h2>
        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">Vous devrez vous reconnecter pour accéder à votre compte.</p>
        <div class="flex justify-end gap-2">
          <button type="button" (click)="confirming.set(false)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">Annuler</button>
          <button type="button" (click)="logout()" class="rounded bg-slate-800 px-3 py-1.5 text-sm text-white">Se déconnecter</button>
        </div>
      </app-modal>
    }
  `,
})
export class LogoutButton {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly confirming = signal(false);

  logout(): void {
    this.confirming.set(false);
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
