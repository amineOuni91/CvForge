import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-button',
  imports: [RouterLink],
  template: `
    <a
      routerLink="/accueil"
      class="fixed bottom-16 left-3 z-50 rounded-full border border-slate-300 bg-white p-2 text-sm shadow-sm lg:bottom-3 dark:border-slate-600 dark:bg-slate-800"
      aria-label="Retour à l'accueil"
    >
      🏠
    </a>
  `,
})
export class HomeButton {}
