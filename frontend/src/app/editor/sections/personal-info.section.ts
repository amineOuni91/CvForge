import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { CvStore } from '../cv-store';
import { PersonalInfo } from '../../models/cv-document';

@Component({
  selector: 'app-personal-info-section',
  template: `
    @if (info(); as info) {
      <div class="mb-3 flex items-center gap-3">
        @if (info.photoUrl) {
          <img [src]="info.photoUrl" alt="" class="h-16 w-16 rounded-full object-cover" />
        } @else {
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400 dark:bg-slate-700 dark:text-slate-500">Photo</div>
        }
        <div class="flex flex-col gap-1">
          <label class="cursor-pointer text-sm text-slate-600 hover:underline dark:text-slate-300">
            {{ uploading() ? 'Envoi...' : 'Choisir une photo' }}
            <input type="file" accept="image/jpeg,image/png" class="hidden" [disabled]="uploading()" (change)="uploadPhoto($event)" />
          </label>
          @if (info.photoUrl) {
            <button type="button" class="text-left text-sm text-red-600 hover:underline dark:text-red-400" (click)="removePhoto()">Retirer la photo</button>
          }
          <p class="text-xs text-slate-400 dark:text-slate-500">Facultatif — le CV reste inchangé sans photo.</p>
          @if (photoError(); as msg) { <p class="text-xs text-red-600 dark:text-red-400">{{ msg }}</p> }
        </div>
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
        <label class="text-sm">Pays
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.country"
                 (input)="patch({ country: value($event) })" />
        </label>
        <label class="text-sm">LinkedIn
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.linkedIn"
                 (input)="patch({ linkedIn: value($event) })" />
        </label>
        <label class="text-sm">GitHub
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.gitHub"
                 (input)="patch({ gitHub: value($event) })" />
        </label>
        <label class="text-sm">Portfolio
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.portfolio"
                 (input)="patch({ portfolio: value($event) })" />
        </label>
        <label class="text-sm">Site web
          <input class="mt-1 w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100" [value]="info.website"
                 (input)="patch({ website: value($event) })" />
        </label>
      </div>
    }
  `,
})
export class PersonalInfoSection {
  private readonly store = inject(CvStore);
  private readonly http = inject(HttpClient);
  readonly info = computed(() => this.store.document()?.personalInfo);
  readonly uploading = signal(false);
  readonly photoError = signal<string | null>(null);

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  patch(changes: Partial<PersonalInfo>): void {
    this.store.update((doc) => ({ ...doc, personalInfo: { ...doc.personalInfo, ...changes } }));
  }

  async uploadPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const cvId = this.store.cvId();
    if (!file || !cvId) return;

    this.uploading.set(true);
    this.photoError.set(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await firstValueFrom(
        this.http.post<{ photoUrl: string }>(`${API_BASE_URL}/api/cvs/${cvId}/photo`, formData),
      );
      this.patch({ photoUrl: result.photoUrl });
    } catch (err) {
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.photoError.set(message ?? "Échec de l'envoi de la photo.");
    } finally {
      this.uploading.set(false);
    }
  }

  async removePhoto(): Promise<void> {
    const cvId = this.store.cvId();
    if (!cvId) return;
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/cvs/${cvId}/photo`));
    this.patch({ photoUrl: null });
  }
}
