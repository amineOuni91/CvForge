import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { SkillCategory } from '../../models/cv-document';
import { TagInput } from '../../ui/tag-input';

const EMPTY_CATEGORY: SkillCategory = { name: '', skills: [] };

@Component({
  selector: 'app-skills-section',
  imports: [TagInput, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <div cdkDropList class="space-y-4" (cdkDropListDropped)="onDrop($event)">
      @for (cat of categories(); track $index) {
        <div cdkDrag class="rounded border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-start justify-between gap-2">
            <span cdkDragHandle class="cursor-move text-slate-400" title="Réordonner">⠿</span>
            <input class="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Catégorie (ex. Backend)"
                   [value]="cat.name" (input)="patch($index, { name: value($event) })" />
            <button type="button" (click)="remove($index)" class="text-sm text-red-600 dark:text-red-400">Supprimer</button>
          </div>
          <app-tag-input [values]="cat.skills" placeholder="Ajouter une compétence..."
                          (valuesChange)="patch($index, { skills: $event })" />
        </div>
      }
      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
        + Ajouter une catégorie
      </button>
    </div>
  `,
})
export class SkillsSection {
  private readonly store = inject(CvStore);
  readonly categories = computed(() => this.store.document()?.skillCategories ?? []);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(index: number, changes: Partial<SkillCategory>): void {
    this.store.update((doc) => ({
      ...doc,
      skillCategories: doc.skillCategories.map((c, i) => (i === index ? { ...c, ...changes } : c)),
    }));
  }

  add(): void {
    this.store.update((doc) => ({ ...doc, skillCategories: [...doc.skillCategories, { ...EMPTY_CATEGORY }] }));
  }

  remove(index: number): void {
    this.store.update((doc) => ({ ...doc, skillCategories: doc.skillCategories.filter((_, i) => i !== index) }));
  }

  onDrop(event: CdkDragDrop<SkillCategory[]>): void {
    this.store.update((doc) => {
      const skillCategories = [...doc.skillCategories];
      moveItemInArray(skillCategories, event.previousIndex, event.currentIndex);
      return { ...doc, skillCategories };
    });
  }
}
