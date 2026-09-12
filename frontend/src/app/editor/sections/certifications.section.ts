import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { Certification } from '../../models/cv-document';

const EMPTY_CERTIFICATION: Certification = { name: '', issuer: '', date: '', url: '' };

@Component({
  selector: 'app-certifications-section',
  template: `
    <div class="space-y-3">
      @for (cert of certifications(); track $index) {
        <div class="rounded border border-slate-200 p-3 dark:border-slate-700">
          <div class="mb-2 flex items-start justify-between gap-2">
            <input class="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Nom de la certification"
                   [value]="cert.name" (input)="patch($index, { name: value($event) })" />
            <button type="button" (click)="remove($index)" class="text-sm text-red-600 dark:text-red-400">Supprimer</button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <input class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="Émetteur"
                   [value]="cert.issuer" (input)="patch($index, { issuer: value($event) })" />
            <input type="month" class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                   [value]="cert.date" (input)="patch($index, { date: value($event) })" />
            <input class="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" placeholder="URL"
                   [value]="cert.url" (input)="patch($index, { url: value($event) })" />
          </div>
        </div>
      }
      <button type="button" (click)="add()" class="w-full rounded border border-dashed border-slate-300 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
        + Ajouter une certification
      </button>
    </div>
  `,
})
export class CertificationsSection {
  private readonly store = inject(CvStore);
  readonly certifications = computed(() => this.store.document()?.certifications ?? []);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(index: number, changes: Partial<Certification>): void {
    this.store.update((doc) => ({
      ...doc,
      certifications: doc.certifications.map((c, i) => (i === index ? { ...c, ...changes } : c)),
    }));
  }

  add(): void {
    this.store.update((doc) => ({ ...doc, certifications: [...doc.certifications, { ...EMPTY_CERTIFICATION }] }));
  }

  remove(index: number): void {
    this.store.update((doc) => ({ ...doc, certifications: doc.certifications.filter((_, i) => i !== index) }));
  }
}
