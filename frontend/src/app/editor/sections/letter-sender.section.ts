import { Component, computed, inject } from '@angular/core';
import { LetterStore } from '../letter-store';
import { PersonalInfo } from '../../models/cv-document';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-letter-sender-section',
  template: `
    @if (info(); as info) {
      <div class="mb-3">
        <button type="button" class="text-sm text-indigo-600 hover:underline dark:text-indigo-400" (click)="fillFromProfile()">
          Remplir depuis mon profil
        </button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label class="text-sm">Prénom
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.firstName"
                 (input)="patch({ firstName: value($event) })" />
        </label>
        <label class="text-sm">Nom
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.lastName"
                 (input)="patch({ lastName: value($event) })" />
        </label>
        <label class="col-span-2 text-sm">Titre
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.jobTitle"
                 (input)="patch({ jobTitle: value($event) })" />
        </label>
        <label class="text-sm">Email
          <input type="email" class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.email"
                 (input)="patch({ email: value($event) })" />
        </label>
        <label class="text-sm">Téléphone
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.phone"
                 (input)="patch({ phone: value($event) })" />
        </label>
        <label class="text-sm">Ville
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.city"
                 (input)="patch({ city: value($event) })" />
        </label>
      </div>
    }
  `,
})
export class LetterSenderSection {
  private readonly store = inject(LetterStore);
  private readonly auth = inject(AuthService);
  readonly info = computed(() => this.store.document()?.sender);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(changes: Partial<PersonalInfo>): void {
    this.store.update((doc) => ({ ...doc, sender: { ...doc.sender, ...changes } }));
  }

  fillFromProfile(): void {
    const profileInfo = this.auth.currentUser()?.profileInfo;
    if (!profileInfo) return;
    const { photoUrl: _photoUrl, ...fields } = profileInfo;
    this.patch(fields);
  }
}
