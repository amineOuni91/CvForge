import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { Experience } from '../../models/cv-document';
import { TagInput } from '../../ui/tag-input';

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
  imports: [TagInput, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <div cdkDropList class="space-y-4" (cdkDropListDropped)="onDrop($event)">
      @for (exp of experiences(); track $index) {
        <div cdkDrag class="rounded border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-start justify-between gap-2">
            <span cdkDragHandle class="cursor-move pt-1.5 text-slate-400" title="Réordonner">⠿</span>
            <div class="grid flex-1 grid-cols-2 gap-2">
              <input class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Poste"
                     [value]="exp.position" (input)="patch($index, { position: value($event) })" />
              <input class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Entreprise"
                     [value]="exp.company" (input)="patch($index, { company: value($event) })" />
            </div>
            <button type="button" (click)="remove($index)" class="text-sm text-red-600 dark:text-red-400">Supprimer</button>
          </div>

          <div class="mb-2 grid grid-cols-4 gap-2">
            <input class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Ville"
                   [value]="exp.city" (input)="patch($index, { city: value($event) })" />
            <input class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Pays"
                   [value]="exp.country" (input)="patch($index, { country: value($event) })" />
            <input type="month" class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                   [value]="exp.startDate" (input)="patch($index, { startDate: value($event) })" />
            <input type="month" class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [disabled]="exp.isCurrent"
                   [value]="exp.endDate ?? ''" (input)="patch($index, { endDate: value($event) })" />
          </div>

          <label class="mb-2 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" [checked]="exp.isCurrent"
                   (change)="patch($index, { isCurrent: checked($event), endDate: checked($event) ? null : exp.endDate })" />
            Poste actuel
          </label>

          <textarea rows="2" class="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Description"
                    [value]="exp.description" (input)="patch($index, { description: textareaValue($event) })"></textarea>

          <div class="mb-2">
            <span class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Technologies</span>
            <app-tag-input [values]="exp.technologies" placeholder="Ajouter une techno..."
                            (valuesChange)="patch($index, { technologies: $event })" />
          </div>
          <div class="mb-2">
            <span class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Missions</span>
            <app-tag-input [values]="exp.missions" placeholder="Ajouter une mission..."
                            (valuesChange)="patch($index, { missions: $event })" />
          </div>
          <div>
            <span class="mb-1 block text-xs text-slate-500 dark:text-slate-400">Réalisations</span>
            <app-tag-input [values]="exp.achievements" placeholder="Ajouter une réalisation..."
                            (valuesChange)="patch($index, { achievements: $event })" />
          </div>
        </div>
      }

      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
        + Ajouter une expérience
      </button>
    </div>
  `,
})
export class ExperiencesSection {
  private readonly store = inject(CvStore);
  readonly experiences = computed(() => this.store.document()?.experiences ?? []);

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
