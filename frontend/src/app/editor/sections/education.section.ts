import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { EducationEntry } from '../../models/cv-document';

const EMPTY_EDUCATION: EducationEntry = {
  degree: '', school: '', city: '', country: '', graduationYear: '', description: '',
};

@Component({
  selector: 'app-education-section',
  template: `
    <div class="space-y-4">
      @for (edu of education(); track $index) {
        <div class="rounded border border-slate-200 p-3">
          <div class="mb-2 flex items-start justify-between gap-2">
            <div class="grid flex-1 grid-cols-2 gap-2">
              <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Diplôme"
                     [value]="edu.degree" (input)="patch($index, { degree: value($event) })" />
              <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="École"
                     [value]="edu.school" (input)="patch($index, { school: value($event) })" />
            </div>
            <button type="button" (click)="remove($index)" class="text-sm text-red-600">Supprimer</button>
          </div>
          <div class="mb-2 grid grid-cols-3 gap-2">
            <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Ville"
                   [value]="edu.city" (input)="patch($index, { city: value($event) })" />
            <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Pays"
                   [value]="edu.country" (input)="patch($index, { country: value($event) })" />
            <input type="number" min="1950" max="2099" placeholder="Année d'obtention"
                   class="rounded border border-slate-300 px-2 py-1 text-sm"
                   [value]="edu.graduationYear" (input)="patch($index, { graduationYear: value($event) })" />
          </div>
          <textarea rows="2" class="w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Description"
                    [value]="edu.description" (input)="patch($index, { description: textareaValue($event) })"></textarea>
        </div>
      }
      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600">
        + Ajouter une formation
      </button>
    </div>
  `,
})
export class EducationSection {
  private readonly store = inject(CvStore);
  readonly education = computed(() => this.store.document()?.education ?? []);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  textareaValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  patch(index: number, changes: Partial<EducationEntry>): void {
    this.store.update((doc) => ({
      ...doc,
      education: doc.education.map((e, i) => (i === index ? { ...e, ...changes } : e)),
    }));
  }

  add(): void {
    this.store.update((doc) => ({ ...doc, education: [...doc.education, { ...EMPTY_EDUCATION }] }));
  }

  remove(index: number): void {
    this.store.update((doc) => ({ ...doc, education: doc.education.filter((_, i) => i !== index) }));
  }
}
