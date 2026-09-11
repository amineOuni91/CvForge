import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { PersonalInfo } from '../../models/cv-document';

@Component({
  selector: 'app-personal-info-section',
  template: `
    @if (info(); as info) {
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm">Prénom
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.firstName"
                 (input)="patch({ firstName: value($event) })" />
        </label>
        <label class="text-sm">Nom
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.lastName"
                 (input)="patch({ lastName: value($event) })" />
        </label>
        <label class="col-span-2 text-sm">Titre
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.jobTitle"
                 (input)="patch({ jobTitle: value($event) })" />
        </label>
        <label class="text-sm">Email
          <input type="email" class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.email"
                 (input)="patch({ email: value($event) })" />
        </label>
        <label class="text-sm">Téléphone
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.phone"
                 (input)="patch({ phone: value($event) })" />
        </label>
        <label class="text-sm">Ville
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.city"
                 (input)="patch({ city: value($event) })" />
        </label>
        <label class="text-sm">Pays
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.country"
                 (input)="patch({ country: value($event) })" />
        </label>
        <label class="text-sm">LinkedIn
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.linkedIn"
                 (input)="patch({ linkedIn: value($event) })" />
        </label>
        <label class="text-sm">GitHub
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.gitHub"
                 (input)="patch({ gitHub: value($event) })" />
        </label>
        <label class="text-sm">Portfolio
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.portfolio"
                 (input)="patch({ portfolio: value($event) })" />
        </label>
        <label class="text-sm">Site web
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1" [value]="info.website"
                 (input)="patch({ website: value($event) })" />
        </label>
      </div>
    }
  `,
})
export class PersonalInfoSection {
  private readonly store = inject(CvStore);
  readonly info = computed(() => this.store.document()?.personalInfo);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(changes: Partial<PersonalInfo>): void {
    this.store.update((doc) => ({ ...doc, personalInfo: { ...doc.personalInfo, ...changes } }));
  }
}
