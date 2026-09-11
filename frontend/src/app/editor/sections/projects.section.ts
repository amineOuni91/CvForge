import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { Project } from '../../models/cv-document';
import { TagInput } from '../../ui/tag-input';

const EMPTY_PROJECT: Project = { name: '', description: '', role: '', technologies: [], url: '', date: '' };

@Component({
  selector: 'app-projects-section',
  imports: [TagInput],
  template: `
    <div class="space-y-4">
      @for (project of projects(); track $index) {
        <div class="rounded border border-slate-200 p-3">
          <div class="mb-2 flex items-start justify-between gap-2">
            <input class="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Nom du projet"
                   [value]="project.name" (input)="patch($index, { name: value($event) })" />
            <button type="button" (click)="remove($index)" class="text-sm text-red-600">Supprimer</button>
          </div>
          <div class="mb-2 grid grid-cols-3 gap-2">
            <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Rôle"
                   [value]="project.role" (input)="patch($index, { role: value($event) })" />
            <input class="rounded border border-slate-300 px-2 py-1 text-sm" placeholder="URL"
                   [value]="project.url" (input)="patch($index, { url: value($event) })" />
            <input type="month" class="rounded border border-slate-300 px-2 py-1 text-sm"
                   [value]="project.date" (input)="patch($index, { date: value($event) })" />
          </div>
          <textarea rows="2" class="mb-2 w-full rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Description"
                    [value]="project.description" (input)="patch($index, { description: textareaValue($event) })"></textarea>
          <app-tag-input [values]="project.technologies" placeholder="Ajouter une techno..."
                          (valuesChange)="patch($index, { technologies: $event })" />
        </div>
      }
      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600">
        + Ajouter un projet
      </button>
    </div>
  `,
})
export class ProjectsSection {
  private readonly store = inject(CvStore);
  readonly projects = computed(() => this.store.document()?.projects ?? []);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  textareaValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  patch(index: number, changes: Partial<Project>): void {
    this.store.update((doc) => ({
      ...doc,
      projects: doc.projects.map((p, i) => (i === index ? { ...p, ...changes } : p)),
    }));
  }

  add(): void {
    this.store.update((doc) => ({ ...doc, projects: [...doc.projects, { ...EMPTY_PROJECT }] }));
  }

  remove(index: number): void {
    this.store.update((doc) => ({ ...doc, projects: doc.projects.filter((_, i) => i !== index) }));
  }
}
