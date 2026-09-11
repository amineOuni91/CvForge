import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CvStore } from '../cv-store';
import { Experience } from '../../models/cv-document';
import { TagInput } from '../../ui/tag-input';
import { AiAssistantService } from '../ai.service';
import { AiSuggestion } from '../ai-suggestion.component';

const EMPTY_EXPERIENCE: Experience = {
  position: '',
  company: '',
  city: '',
  country: '',
  startDate: '',
  endDate: null,
  isCurrent: false,
  description: '',
  technologies: [],
  missions: [],
  achievements: [],
};

@Component({
  selector: 'app-experiences-section',
  imports: [TagInput, CdkDropList, CdkDrag, CdkDragHandle, AiSuggestion],
  template: `
    <div cdkDropList class="space-y-4" (cdkDropListDropped)="onDrop($event)">
      @for (exp of experiences(); track $index) {
        <div cdkDrag class="rounded border border-slate-200 p-3">
          <div class="mb-2 flex items-start justify-between gap-2">
            <span cdkDragHandle class="cursor-move pt-1.5 text-slate-400" title="Réordonner">⠿</span>
            <div class="grid flex-1 grid-cols-2 gap-2">
              <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Poste"
                     [value]="exp.position" (input)="patch($index, { position: value($event) })" />
              <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Entreprise"
                     [value]="exp.company" (input)="patch($index, { company: value($event) })" />
            </div>
            <button type="button" (click)="remove($index)" class="text-sm text-red-600">Supprimer</button>
          </div>

          <div class="mb-2 grid grid-cols-4 gap-2">
            <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Ville"
                   [value]="exp.city" (input)="patch($index, { city: value($event) })" />
            <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Pays"
                   [value]="exp.country" (input)="patch($index, { country: value($event) })" />
            <input type="month" class="rounded border border-slate-300 px-2 py-1 text-sm"
                   [value]="exp.startDate" (input)="patch($index, { startDate: value($event) })" />
            <input type="month" class="rounded border border-slate-300 px-2 py-1 text-sm" [disabled]="exp.isCurrent"
                   [value]="exp.endDate ?? ''" (input)="patch($index, { endDate: value($event) })" />
          </div>

          <label class="mb-2 flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" [checked]="exp.isCurrent"
                   (change)="patch($index, { isCurrent: checked($event), endDate: checked($event) ? null : exp.endDate })" />
            Poste actuel
          </label>

          <textarea rows="2" class="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Description"
                    [value]="exp.description" (input)="patch($index, { description: textareaValue($event) })"></textarea>

          @if (exp.description) {
            <div class="mb-2">
              <app-ai-suggestion label="✨ Améliorer avec l'IA" [fetchFn]="improveFn($index)" (accepted)="patch($index, { description: $event })" />
            </div>
          }

          <div class="mb-2">
            <span class="mb-1 block text-xs text-slate-500">Technologies</span>
            <app-tag-input [values]="exp.technologies" placeholder="Ajouter une techno..."
                            (valuesChange)="patch($index, { technologies: $event })" />
          </div>
          <div class="mb-2">
            <span class="mb-1 block text-xs text-slate-500">Missions</span>
            <app-tag-input [values]="exp.missions" placeholder="Ajouter une mission..."
                            (valuesChange)="patch($index, { missions: $event })" />
          </div>
          <div>
            <span class="mb-1 block text-xs text-slate-500">Réalisations</span>
            <app-tag-input [values]="exp.achievements" placeholder="Ajouter une réalisation..."
                            (valuesChange)="patch($index, { achievements: $event })" />
            @if (exp.description) {
              <button type="button" (click)="generateAchievements($index)"
                      [disabled]="!ai.available() || generatingIndex() === $index"
                      [title]="ai.available() ? '' : 'Configurez ANTHROPIC_API_KEY pour activer l\\'assistant IA'"
                      class="mt-1 text-xs font-medium text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline">
                {{ generatingIndex() === $index ? 'Génération...' : '✨ Générer des réalisations' }}
              </button>
              @if (pendingAchievements(); as pending) {
                @if (pending.index === $index) {
                  <div class="mt-2 rounded border border-indigo-200 bg-indigo-50 p-2">
                    <ul class="list-disc pl-4 text-sm text-slate-700">
                      @for (item of pending.items; track item) { <li>{{ item }}</li> }
                    </ul>
                    <div class="mt-2 flex gap-2">
                      <button type="button" (click)="acceptAchievements($index)" class="rounded bg-indigo-600 px-2 py-1 text-xs text-white">Accepter</button>
                      <button type="button" (click)="pendingAchievements.set(null)" class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600">Ignorer</button>
                    </div>
                  </div>
                }
              }
            }
          </div>
        </div>
      }

      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600">
        + Ajouter une expérience
      </button>
    </div>
  `,
})
export class ExperiencesSection implements OnInit {
  private readonly store = inject(CvStore);
  protected readonly ai = inject(AiAssistantService);
  readonly experiences = computed(() => this.store.document()?.experiences ?? []);

  readonly generatingIndex = signal<number | null>(null);
  readonly pendingAchievements = signal<{ index: number; items: string[] } | null>(null);

  ngOnInit(): void {
    this.ai.checkAvailability();
  }

  improveFn(index: number): () => Promise<string> {
    return () => this.ai.improveText(this.experiences()[index].description);
  }

  async generateAchievements(index: number): Promise<void> {
    this.generatingIndex.set(index);
    try {
      const items = await this.ai.generateBulletPoints(this.experiences()[index].description);
      this.pendingAchievements.set({ index, items });
    } finally {
      this.generatingIndex.set(null);
    }
  }

  acceptAchievements(index: number): void {
    const pending = this.pendingAchievements();
    if (!pending || pending.index !== index) return;
    this.patch(index, { achievements: [...this.experiences()[index].achievements, ...pending.items] });
    this.pendingAchievements.set(null);
  }

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  textareaValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  patch(index: number, changes: Partial<Experience>): void {
    this.store.update((doc) => ({
      ...doc,
      experiences: doc.experiences.map((e, i) => (i === index ? { ...e, ...changes } : e)),
    }));
  }

  add(): void {
    this.store.update((doc) => ({ ...doc, experiences: [...doc.experiences, { ...EMPTY_EXPERIENCE }] }));
  }

  remove(index: number): void {
    this.store.update((doc) => ({ ...doc, experiences: doc.experiences.filter((_, i) => i !== index) }));
  }

  onDrop(event: CdkDragDrop<Experience[]>): void {
    this.store.update((doc) => {
      const experiences = [...doc.experiences];
      moveItemInArray(experiences, event.previousIndex, event.currentIndex);
      return { ...doc, experiences };
    });
  }
}
