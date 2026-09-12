import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n.service';
import { TPipe } from '../../core/t.pipe';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, TPipe],
  template: `
    <div class="min-h-screen bg-white dark:bg-slate-900">
      <header class="flex items-center justify-between px-6 py-4 sm:px-10">
        <span class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ 'app.name' | t }}</span>
        <div class="flex items-center gap-4 text-sm">
          <button type="button" (click)="i18n.toggle()" class="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            {{ i18n.lang() === 'fr' ? 'EN' : 'FR' }}
          </button>
          @if (auth.currentUser(); as user) {
            <span class="text-slate-500 dark:text-slate-400">{{ user.email }}</span>
            <a routerLink="/profile" class="text-slate-600 hover:underline dark:text-slate-300">{{ 'profile.title' | t }}</a>
          } @else {
            <a routerLink="/login" class="text-slate-600 hover:underline dark:text-slate-300">{{ 'landing.hero.cta.login' | t }}</a>
          }
        </div>
      </header>

      <main class="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-100">{{ 'landing.hero.title' | t }}</h1>
        <p class="mx-auto mt-4 max-w-xl text-slate-600 sm:text-lg dark:text-slate-300">{{ 'landing.hero.subtitle' | t }}</p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          @if (auth.currentUser()) {
            <a
              routerLink="/dashboard"
              class="w-full rounded bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 sm:w-auto"
            >
              {{ 'landing.cta.myCvs' | t }}
            </a>
          } @else {
            <a
              routerLink="/register"
              class="w-full rounded bg-slate-800 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 sm:w-auto"
            >
              {{ 'landing.hero.cta.start' | t }}
            </a>
            <a
              routerLink="/login"
              class="w-full rounded border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {{ 'landing.hero.cta.login' | t }}
            </a>
          }
        </div>

        @if (cvCount() !== null) {
          <div class="mx-auto mt-8 inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-5 py-2 dark:border-slate-700 dark:bg-slate-800">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            <span class="text-sm text-slate-600 dark:text-slate-300">
              <span class="font-bold tabular-nums text-slate-900 dark:text-slate-100">{{ cvCount()!.toLocaleString('fr-FR') }}</span>
              {{ 'landing.stats.cvCreated' | t }}
            </span>
          </div>
        }
      </main>

      <section class="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border border-slate-200 p-5 dark:border-slate-700">
          <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.feature.preview.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.feature.preview.body' | t }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-5 dark:border-slate-700">
          <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.feature.templates.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.feature.templates.body' | t }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-5 dark:border-slate-700">
          <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.feature.pdf.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.feature.pdf.body' | t }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-5 dark:border-slate-700">
          <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.feature.ats.title' | t }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.feature.ats.body' | t }}</p>
        </div>
      </section>

      <section class="mx-auto max-w-5xl px-6 pb-20">
        <h2 class="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">{{ 'landing.how.title' | t }}</h2>
        <p class="mt-2 text-center text-slate-500 dark:text-slate-400">{{ 'landing.how.subtitle' | t }}</p>
        <div class="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex h-40 items-center justify-center border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <div class="flex aspect-[210/297] w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500">
                <span class="text-xl leading-none">+</span>
                <span class="text-[9px] font-medium">Nouveau CV</span>
              </div>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.how.create.title' | t }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.how.create.body' | t }}</p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex h-40 items-center justify-center border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span class="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">
                <span>⇪</span><span>Importer un CV (JSON)</span>
              </span>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.how.import.title' | t }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.how.import.body' | t }}</p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex h-40 items-center justify-center gap-2 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span class="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">PDF ▾</span>
              <span class="flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-xs text-white">⬇ Exporter</span>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.how.export.title' | t }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.how.export.body' | t }}</p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex h-40 items-center justify-center gap-3 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-base dark:border-slate-600 dark:bg-slate-800">☀️</span>
              <span class="text-slate-400 dark:text-slate-500">→</span>
              <span class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-base text-white">🌙</span>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.how.theme.title' | t }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.how.theme.body' | t }}</p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex h-40 items-center justify-center gap-2 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span class="rounded border-2 border-slate-800 bg-slate-100 px-2 py-2 text-[10px] text-slate-700 dark:border-slate-300 dark:bg-slate-700 dark:text-slate-100">Modern</span>
              <span class="rounded border border-slate-300 px-2 py-2 text-[10px] text-slate-500 dark:border-slate-600 dark:text-slate-400">Minimal</span>
              <span class="rounded border border-slate-300 px-2 py-2 text-[10px] text-slate-500 dark:border-slate-600 dark:text-slate-400">Executive</span>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.how.template.title' | t }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.how.template.body' | t }}</p>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div class="flex h-40 flex-col items-center justify-center gap-2 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span class="rounded bg-slate-800 px-3 py-1.5 text-xs text-white">✨ Analyser mon CV</span>
              <span class="rounded border border-slate-200 px-4 py-1 text-center dark:border-slate-700">
                <span class="block text-lg font-bold text-green-600 dark:text-green-400">82/100</span>
                <span class="block text-[9px] text-slate-500 dark:text-slate-400">Score global</span>
              </span>
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-slate-800 dark:text-slate-100">{{ 'landing.how.analyze.title' | t }}</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ 'landing.how.analyze.body' | t }}</p>
            </div>
          </div>
        </div>
      </section>

      <footer class="border-t border-slate-100 px-6 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        © {{ year }} {{ 'app.name' | t }} — {{ 'landing.footer.rights' | t }}
      </footer>
    </div>
  `,
})
export class Landing implements OnInit {
  protected readonly i18n = inject(I18nService);
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  protected readonly year = new Date().getFullYear();

  protected readonly cvCount = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const { count } = await firstValueFrom(this.http.get<{ count: number }>(`${API_BASE_URL}/api/stats/cv-count`));
      this.cvCount.set(count);
    } catch {
      // social-proof counter is a nice-to-have; hide it silently if the request fails
    }
  }
}
