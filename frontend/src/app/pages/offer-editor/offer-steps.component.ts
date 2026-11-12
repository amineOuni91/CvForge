import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { buildIcs } from '../../core/offer-utils';
import { TPipe } from '../../core/t.pipe';
import { OfferStore } from '../../editor/offer-store';
import { newStep, OfferStep, StepFormat, StepResult, StepType } from '../../models/job-offer';

const INPUT = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';
const CARD = 'rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800';
const DOT = 'absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full';

const ICONS: Record<StepType, string> = {
  cvSent: '📤', hrCall: '📞', hrInterview: '🧑‍💼', techInterview: '💻',
  techTest: '🧪', directorInterview: '👔', offerReceived: '🎉', other: '📌',
};
const INTERVIEW_TYPES: StepType[] = ['hrInterview', 'techInterview', 'directorInterview'];

@Component({
  selector: 'app-offer-steps',
  imports: [TPipe, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <div class="grid gap-6 text-slate-800 lg:grid-cols-5 dark:text-slate-100">
      <div class="${CARD} lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-semibold">{{ 'offerSteps.timeline' | t }}</h2>
          <button type="button" (click)="add()" class="rounded bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 dark:bg-slate-700">+ {{ 'offerSteps.add' | t }}</button>
        </div>
        <ol cdkDropList class="relative ml-3 space-y-5 border-l-2 border-slate-200 dark:border-slate-700" (cdkDropListDropped)="onDrop($event)">
          @for (s of steps(); track s.id) {
            <li cdkDrag class="ml-5 cursor-pointer" [class]="s.id === selectedId() ? 'rounded-lg bg-indigo-50 p-2 ring-2 ring-indigo-500 dark:bg-indigo-500/10' : ''" (click)="selectedId.set(s.id)">
              @if (s.id === selectedId()) {
                <span class="${DOT} bg-indigo-500 ring-4 ring-indigo-200 dark:ring-indigo-500/30"></span>
              } @else if (s.result === 'passed') {
                <span class="${DOT} bg-emerald-500 text-[9px] text-white">✓</span>
              } @else if (s.result === 'failed') {
                <span class="${DOT} bg-red-500 text-[9px] text-white">✕</span>
              } @else if (s.result === 'cancelled') {
                <span class="${DOT} bg-slate-400 dark:bg-slate-500"></span>
              } @else if (s.date) {
                <span class="${DOT} border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"></span>
              } @else {
                <span class="${DOT} border-2 border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"></span>
              }
              <div class="flex items-start gap-2">
                <span cdkDragHandle class="cursor-move text-slate-400" [title]="'offerSteps.reorder' | t" (click)="$event.stopPropagation()">⠿</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium" [class.line-through]="s.result === 'cancelled'" [class.text-slate-400]="!s.date || s.result === 'cancelled'">{{ icon(s.type) }} {{ stepLabel(s) }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400" [class.text-slate-400]="!s.date">{{ meta(s) }}</p>
                  @if (s.result === 'upcoming' && daysUntil(s) !== null) {
                    <span class="rounded-full bg-indigo-100 px-2 text-[11px] text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{{ inDays(daysUntil(s)!) }}</span>
                  } @else if (s.result !== 'upcoming') {
                    <span class="text-[11px]" [class]="s.result === 'passed' ? 'text-emerald-600 dark:text-emerald-400' : s.result === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-slate-400'">{{ 'offerSteps.res.' + s.result | t }}</span>
                  }
                </div>
              </div>
            </li>
          }
        </ol>
      </div>

      <div class="${CARD} lg:col-span-3">
        @if (suggestInterview()) {
          <div class="mb-4 flex flex-wrap items-center gap-3 rounded border border-dashed border-indigo-300 bg-indigo-50 p-2 text-sm text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">
            <span>{{ 'offerSteps.suggest' | t }}</span>
            <button type="button" (click)="setInterviewStatus()" class="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500">{{ 'offerSteps.suggestBtn' | t }}</button>
          </div>
        }
        @if (selected(); as s) {
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-semibold">{{ 'offerSteps.detail' | t }}</h2>
            <div class="flex gap-3 text-sm text-slate-500 dark:text-slate-400">
              <button type="button" [disabled]="!s.date" (click)="downloadIcs(s)" [title]="'offerSteps.icsTitle' | t" class="disabled:opacity-40">📅 <span class="text-xs">{{ 'offerSteps.ics' | t }}</span></button>
              <button type="button" (click)="remove(s.id)" [title]="'offerSteps.delete' | t">🗑️</button>
            </div>
          </div>
          <div class="grid gap-4 text-sm sm:grid-cols-2">
            <label>{{ 'offerSteps.type' | t }}
              <select class="${INPUT}" (change)="patch(s.id, { type: $any($event.target).value })">
                @for (ty of types; track ty) {
                  <option [value]="ty" [selected]="ty === s.type">{{ 'offers.stepType.' + ty | t }}</option>
                }
              </select></label>
            @if (s.type === 'other') {
              <label>{{ 'offerSteps.label' | t }}
                <input class="${INPUT}" [value]="s.label" (input)="patch(s.id, { label: $any($event.target).value })" /></label>
            }
            <label>{{ 'offerSteps.date' | t }}
              <input type="datetime-local" class="${INPUT}" [value]="s.date ?? ''" (input)="onDate(s.id, $any($event.target))" /></label>
            <label>{{ 'offerSteps.format' | t }}
              <select class="${INPUT}" (change)="patch(s.id, { format: $any($event.target).value })">
                @for (f of formats; track f) {
                  <option [value]="f" [selected]="f === s.format">{{ 'offers.format.' + f | t }}</option>
                }
              </select></label>
            <label>{{ 'offerSteps.contact' | t }}
              <input class="${INPUT}" [value]="s.contact" (input)="patch(s.id, { contact: $any($event.target).value })" /></label>
            <label class="sm:col-span-2">{{ 'offerSteps.place' | t }}
              <input class="${INPUT}" [value]="s.place" (input)="patch(s.id, { place: $any($event.target).value })" /></label>
          </div>

          <div class="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <label class="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <span class="font-medium">📝 {{ 'offerSteps.noteBefore' | t }}</span>
              <span class="block text-[11px] text-slate-500 dark:text-slate-400">{{ 'offerSteps.noteBeforeHint' | t }}</span>
              <textarea rows="6" class="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        [value]="s.noteBefore" (input)="patch(s.id, { noteBefore: $any($event.target).value })"></textarea></label>
            <label class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
              <span class="font-medium">✅ {{ 'offerSteps.noteAfter' | t }}</span>
              <span class="block text-[11px] text-slate-500 dark:text-slate-400">{{ 'offerSteps.noteAfterHint' | t }}</span>
              <textarea rows="6" class="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        [placeholder]="'offerSteps.noteAfterPh' | t"
                        [value]="s.noteAfter" (input)="patch(s.id, { noteAfter: $any($event.target).value })"></textarea></label>
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span>{{ 'offerSteps.result' | t }}</span>
            @for (r of results; track r) {
              <button type="button" (click)="patch(s.id, { result: r })" class="rounded-full px-3 py-1 text-xs"
                      [class]="s.result === r ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-600'">{{ 'offerSteps.res.' + r | t }}</button>
            }
          </div>
        }
        <p class="mt-4 rounded border border-dashed border-indigo-300 bg-indigo-50 p-2 text-[11px] text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300">{{ 'offerSteps.hint' | t }}</p>
      </div>
    </div>
  `,
})
export class OfferSteps {
  /** Partially edited datetime-local (badInput) reports '' — ignore it so the [value] rebind doesn't wipe the field. */
  protected onDate(id: string, el: HTMLInputElement): void {
    if (el.validity.badInput) return;
    this.patch(id, { date: el.value || null });
  }

  private readonly store = inject(OfferStore);
  private readonly i18n = inject(I18nService);

  readonly types: StepType[] = ['cvSent', 'hrCall', 'hrInterview', 'techInterview', 'techTest', 'directorInterview', 'offerReceived', 'other'];
  readonly formats: StepFormat[] = ['phone', 'video', 'onSite'];
  readonly results: StepResult[] = ['upcoming', 'passed', 'failed', 'cancelled'];

  readonly selectedId = signal<string | null>(null);
  readonly steps = computed(() => this.store.document()?.steps ?? []);
  readonly selected = computed(() => {
    const steps = this.steps();
    return steps.find((s) => s.id === this.selectedId()) ?? steps[0] ?? null;
  });
  readonly suggestInterview = computed(() => {
    const doc = this.store.document();
    return !!doc && (doc.status === 'toApply' || doc.status === 'applied') && doc.steps.some((s) => INTERVIEW_TYPES.includes(s.type));
  });

  protected icon(type: StepType): string { return ICONS[type]; }

  protected stepLabel(s: OfferStep): string {
    return s.type === 'other' && s.label ? s.label : this.i18n.t('offers.stepType.' + s.type);
  }

  protected meta(s: OfferStep): string {
    if (!s.date) return this.i18n.t('offerSteps.noDate');
    const d = new Date(s.date);
    const loc = this.i18n.lang() === 'fr' ? 'fr-FR' : 'en-US';
    // ponytail: Intl instead of DatePipe — only en-US is registered; avoids registerLocaleData('fr').
    const day = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return [`${day} · ${time}`, s.contact].filter(Boolean).join(' · ');
  }

  protected daysUntil(s: OfferStep): number | null {
    if (!s.date) return null;
    const ms = new Date(s.date).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 86_400_000) : null;
  }

  protected inDays(n: number): string {
    return this.i18n.t('offerSteps.inDays').replace('{n}', String(n));
  }

  protected add(): void {
    const step = newStep(this.steps().length === 0 ? 'cvSent' : 'hrInterview');
    this.store.update((doc) => ({ ...doc, steps: [...doc.steps, step] }));
    this.selectedId.set(step.id);
  }

  protected remove(id: string): void {
    this.store.update((doc) => ({ ...doc, steps: doc.steps.filter((s) => s.id !== id) }));
    this.selectedId.set(null);
  }

  protected patch(id: string, change: Partial<OfferStep>): void {
    this.store.update((doc) => ({ ...doc, steps: doc.steps.map((s) => (s.id === id ? { ...s, ...change } : s)) }));
  }

  protected onDrop(e: CdkDragDrop<unknown>): void {
    this.store.update((doc) => {
      const steps = [...doc.steps];
      moveItemInArray(steps, e.previousIndex, e.currentIndex);
      return { ...doc, steps };
    });
  }

  protected setInterviewStatus(): void {
    this.store.update((doc) => ({ ...doc, status: 'interview' }));
  }

  protected downloadIcs(s: OfferStep): void {
    const doc = this.store.document();
    if (!doc || !s.date) return;
    const blob = new Blob([buildIcs(s, doc, this.stepLabel(s))], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.type}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
