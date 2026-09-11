import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { TPipe } from '../../core/t.pipe';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, TPipe],
  template: `
    <div class="min-h-screen bg-white">
      <header class="flex items-center justify-between px-6 py-4 sm:px-10">
        <span class="text-lg font-bold text-slate-800">{{ 'app.name' | t }}</span>
        <div class="flex items-center gap-4 text-sm">
          <button type="button" (click)="i18n.toggle()" class="text-slate-500 hover:text-slate-800">
            {{ i18n.lang() === 'fr' ? 'EN' : 'FR' }}
          </button>
          <a routerLink="/login" class="text-slate-600 hover:underline">{{ 'landing.hero.cta.login' | t }}</a>
        </div>
      </header>

      <main class="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">{{ 'landing.hero.title' | t }}</h1>
        <p class="mx-auto mt-4 max-w-xl text-slate-600 sm:text-lg">{{ 'landing.hero.subtitle' | t }}</p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            routerLink="/register"
            class="w-full rounded bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 sm:w-auto"
          >
            {{ 'landing.hero.cta.start' | t }}
          </a>
          <a
            routerLink="/login"
            class="w-full rounded border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
          >
            {{ 'landing.hero.cta.login' | t }}
          </a>
        </div>
      </main>

      <section class="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border border-slate-200 p-5">
          <h3 class="font-semibold text-slate-800">{{ 'landing.feature.preview.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ 'landing.feature.preview.body' | t }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-5">
          <h3 class="font-semibold text-slate-800">{{ 'landing.feature.templates.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ 'landing.feature.templates.body' | t }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-5">
          <h3 class="font-semibold text-slate-800">{{ 'landing.feature.pdf.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ 'landing.feature.pdf.body' | t }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-5">
          <h3 class="font-semibold text-slate-800">{{ 'landing.feature.ai.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ 'landing.feature.ai.body' | t }}</p>
        </div>
      </section>

      <footer class="border-t border-slate-100 px-6 py-6 text-center text-xs text-slate-400">
        © {{ year }} {{ 'app.name' | t }} — {{ 'landing.footer.rights' | t }}
      </footer>
    </div>
  `,
})
export class Landing {
  protected readonly i18n = inject(I18nService);
  protected readonly year = new Date().getFullYear();
}
