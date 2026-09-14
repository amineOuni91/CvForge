import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { LetterDocument, LetterSummary } from '../../models/letter-document';
import { Modal } from '../../ui/modal';
import { Skeleton } from '../../ui/skeleton';

@Component({
  selector: 'app-letters-tab',
  imports: [RouterLink, DatePipe, Modal, Skeleton],
  template: `
    <div class="mb-6 flex items-center gap-3">
      <button type="button" (click)="fileInput.click()" [disabled]="importing() || accountUnconfirmed()"
              [title]="accountUnconfirmed() ? 'Confirmez votre compte pour importer.' : ''"
              class="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
        {{ importing() ? 'Import en cours...' : '⇪ Importer une lettre (JSON)' }}
      </button>
      <input #fileInput type="file" accept=".json" class="hidden" (change)="onFileSelected($event)" />
    </div>

    @if (importError(); as msg) {
      <p class="mb-4 text-sm text-red-600 dark:text-red-400">{{ msg }}</p>
    }

    @if (loading()) {
      <ul class="flex flex-wrap justify-center gap-4">
        @for (i of [1, 2, 3]; track i) {
          <li class="w-40 overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-800">
            <app-skeleton extraClass="aspect-[210/297] w-full rounded-none" />
            <div class="space-y-2 p-2">
              <app-skeleton extraClass="h-3 w-2/3" />
              <app-skeleton extraClass="h-2.5 w-1/3" />
            </div>
          </li>
        }
      </ul>
    } @else if (letters().length === 0) {
      <div class="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
        <p class="text-slate-500 dark:text-slate-400">Aucune lettre de motivation.</p>
        <button type="button" (click)="createLetter()" class="mt-4 rounded bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700">
          + Créer une lettre
        </button>
      </div>
    } @else {
      <ul class="flex flex-wrap justify-center gap-4">
        <li class="w-40">
          <button type="button" (click)="createLetter()"
                  class="flex aspect-[210/297] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-600 dark:text-slate-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400">
            <span class="text-2xl leading-none">+</span>
            <span class="text-xs font-medium">Nouvelle lettre</span>
          </button>
        </li>
        @for (letter of letters(); track letter.id) {
          <li class="relative w-40 overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800">
            <a [routerLink]="['/letters/editor', letter.id]" class="group block aspect-[210/297] bg-slate-100 ring-2 ring-transparent ring-inset transition-[box-shadow] hover:ring-indigo-500 dark:bg-slate-900 p-1.5">
              @if (thumbnails()[letter.id]; as thumb) {
                <img [src]="thumb" class="h-full w-full rounded-sm object-cover object-top" alt="" />
              } @else {
                <app-skeleton extraClass="h-full w-full rounded-sm" />
              }
            </a>
            <div class="p-2">
              @if (renamingId() === letter.id) {
                <input #renameInput class="w-full rounded border border-slate-300 px-1 py-0.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                       [value]="letter.name" (keydown.enter)="commitRename(letter.id, renameInput.value)" (blur)="commitRename(letter.id, renameInput.value)" />
              } @else {
                <a [routerLink]="['/letters/editor', letter.id]" class="truncate text-sm font-medium text-slate-800 hover:underline dark:text-slate-100">{{ letter.name }}</a>
              }
              <p class="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">{{ letter.updatedAt | date: 'dd/MM/yy HH:mm:ss' }}</p>
              <div class="mt-1.5 flex gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <button type="button" (click)="startRename(letter.id)" title="Renommer" class="transition-colors hover:text-slate-800 dark:hover:text-slate-100">✎</button>
                <button type="button" (click)="duplicate(letter.id)" title="Dupliquer" class="transition-colors hover:text-slate-800 dark:hover:text-slate-100">⧉</button>
                <button type="button" (click)="downloadPdf(letter)" [disabled]="downloadingId() === letter.id || accountUnconfirmed()"
                        [title]="accountUnconfirmed() ? 'Confirmez votre compte pour exporter.' : 'PDF'"
                        class="transition-colors hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-40">⤓</button>
                <button type="button" (click)="askDelete(letter)" title="Supprimer" class="text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">🗑</button>
              </div>
            </div>
          </li>
        }
      </ul>
    }

    @if (toDelete(); as letter) {
      <app-modal (close)="toDelete.set(null)">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Supprimer « {{ letter.name }} » ?</h2>
        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">Cette action est définitive.</p>
        <div class="flex justify-end gap-2">
          <button type="button" (click)="toDelete.set(null)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">Annuler</button>
          <button type="button" (click)="confirmDelete(letter.id)" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white">Supprimer</button>
        </div>
      </app-modal>
    }
  `,
})
export class LettersTab implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly letters = signal<LetterSummary[]>([]);
  readonly thumbnails = signal<Record<string, string>>({});
  readonly renamingId = signal<string | null>(null);
  readonly downloadingId = signal<string | null>(null);
  readonly toDelete = signal<LetterSummary | null>(null);
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly loading = signal(true);

  readonly accountUnconfirmed = computed(
    () => this.auth.currentUser()?.emailConfirmed === false && this.auth.currentUser()?.role !== 'admin',
  );

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  ngOnDestroy(): void {
    for (const url of Object.values(this.thumbnails())) URL.revokeObjectURL(url);
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const letters = await firstValueFrom(this.http.get<LetterSummary[]>(`${API_BASE_URL}/api/letters`));
      this.letters.set(letters);
      for (const letter of letters) this.loadThumbnail(letter.id);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadThumbnail(id: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.http.get(`${API_BASE_URL}/api/letters/${id}/thumbnail`, { responseType: 'blob' }));
      this.thumbnails.update((map) => ({ ...map, [id]: URL.createObjectURL(blob) }));
    } catch {
      // thumbnail is a nice-to-have; leave the placeholder if rendering fails
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importing.set(true);
    this.importError.set(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const document = await firstValueFrom(this.http.post<LetterDocument>(`${API_BASE_URL}/api/letters/import`, formData));
      const created = await firstValueFrom(
        this.http.post<LetterSummary>(`${API_BASE_URL}/api/letters`, { name: file.name.replace(/\.json$/i, ''), document }),
      );
      await this.router.navigate(['/letters/editor', created.id]);
    } catch (err) {
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.importError.set(message ?? "Échec de l'import. Vérifiez le fichier et réessayez.");
    } finally {
      this.importing.set(false);
    }
  }

  async createLetter(): Promise<void> {
    const created = await firstValueFrom(this.http.post<LetterSummary>(`${API_BASE_URL}/api/letters`, {}));
    await this.router.navigate(['/letters/editor', created.id]);
  }

  startRename(id: string): void {
    this.renamingId.set(id);
  }

  async commitRename(id: string, name: string): Promise<void> {
    this.renamingId.set(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = await firstValueFrom(this.http.patch<LetterSummary>(`${API_BASE_URL}/api/letters/${id}/name`, { name: trimmed }));
    this.letters.update((list) => list.map((l) => (l.id === id ? updated : l)));
  }

  async duplicate(id: string): Promise<void> {
    await firstValueFrom(this.http.post<LetterSummary>(`${API_BASE_URL}/api/letters/${id}/duplicate`, {}));
    await this.reload();
    this.toast.success('Lettre dupliquée.');
  }

  async downloadPdf(letter: LetterSummary): Promise<void> {
    this.downloadingId.set(letter.id);
    try {
      const blob = await firstValueFrom(this.http.get(`${API_BASE_URL}/api/letters/${letter.id}/export/pdf`, { responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${letter.name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toast.error('Échec de la génération du PDF.');
    } finally {
      this.downloadingId.set(null);
    }
  }

  askDelete(letter: LetterSummary): void {
    this.toDelete.set(letter);
  }

  async confirmDelete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/letters/${id}`));
    this.toDelete.set(null);
    this.letters.update((list) => list.filter((l) => l.id !== id));
    this.toast.success('Lettre supprimée.');
  }
}
