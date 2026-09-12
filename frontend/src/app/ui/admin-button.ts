import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-button',
  imports: [RouterLink],
  template: `
    <a
      routerLink="/admin"
      class="fixed bottom-32 right-3 z-50 rounded-full border border-slate-300 bg-white p-2 text-sm shadow-sm lg:bottom-16 dark:border-slate-600 dark:bg-slate-800"
      aria-label="Administration"
      title="Administration"
    >
      🛠️
    </a>
  `,
})
export class AdminButton {}
