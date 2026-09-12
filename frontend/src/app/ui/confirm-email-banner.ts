import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { TPipe } from '../core/t.pipe';

@Component({
  selector: 'app-confirm-email-banner',
  imports: [RouterLink, TPipe],
  template: `
    <div class="flex w-full items-center justify-center gap-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
      <span>{{ 'confirmBanner.notice' | t }}</span>
      <a
        [routerLink]="['/confirm-email']"
        [queryParams]="{ email: auth.currentUser()?.email }"
        class="font-semibold underline hover:no-underline"
      >
        {{ 'confirmBanner.cta' | t }}
      </a>
    </div>
  `,
})
export class ConfirmEmailBanner {
  protected readonly auth = inject(AuthService);
}
