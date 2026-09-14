import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { Modal } from '../../ui/modal';

export interface AdminLetterSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-admin-user-letters-panel',
  imports: [DatePipe, RouterLink, Modal],
  template: `
    <h3 class="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Lettres de motivation</h3>
    @if (letters().length === 0) {
      <p class="text-sm text-slate-400 dark:text-slate-500">Aucune lettre.</p>
    } @else {
      <ul class="divide-y divide-slate-100 dark:divide-slate-700">
        @for (letter of letters(); track letter.id) {
          <li class="flex items-center justify-between gap-2 py-1.5 text-sm">
            @if (renamingId() === letter.id) {
              <input
                #renameInput
                class="min-w-0 flex-1 rounded border border-slate-300 px-1 py-0.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                [value]="letter.name"
                (keydown.enter)="commitRename(letter, renameInput.value)"
                (blur)="commitRename(letter, renameInput.value)"
              />
            } @else {
              <a [routerLink]="['/admin/users', userId(), 'letters', letter.id]" class="min-w-0 flex-1 truncate text-slate-700 hover:underline dark:text-slate-200">
                {{ letter.name }} <span class="text-xs text-slate-400">({{ letter.updatedAt | date: 'dd/MM/yy HH:mm' }})</span>
              </a>
            }
            <div class="flex shrink-0 items-center gap-1">
              <button type="button" (click)="startRename(letter)" title="Renommer" class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">✎</button>
              <button type="button" (click)="duplicate(letter)" title="Dupliquer" class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">⧉</button>
              <button type="button" (click)="download(letter)" [disabled]="downloadingId() === letter.id" title="Exporter en PDF"
                      class="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">⤓</button>
              <button type="button" (click)="askDelete(letter)" title="Supprimer" class="rounded-full p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300">🗑️</button>
            </div>
          </li>
        }
      </ul>
    }

    @if (toDelete(); as letter) {
      <app-modal (close)="toDelete.set(null)">
        <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Supprimer « {{ letter.name }} » ?</h2>
        <div class="flex justify-end gap-2">
          <button type="button" (click)="toDelete.set(null)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">Annuler</button>
          <button type="button" (click)="confirmDelete(letter)" class="rounded bg-red-600 px-3 py-1.5 text-sm text-white">Supprimer</button>
        </div>
      </app-modal>
    }
  `,
})
export class AdminUserLettersPanel {
  private readonly http = inject(HttpClient);

  readonly userId = input.required<string>();
  readonly letters = signal<AdminLetterSummary[]>([]);
  readonly renamingId = signal<string | null>(null);
  readonly downloadingId = signal<string | null>(null);
  readonly toDelete = signal<AdminLetterSummary | null>(null);

  constructor() {
    effect(() => {
      const id = this.userId();
      firstValueFrom(this.http.get<AdminLetterSummary[]>(`${API_BASE_URL}/api/admin/users/${id}/letters`)).then((letters) =>
        this.letters.set(letters),
      );
    });
  }

  startRename(letter: AdminLetterSummary): void {
    this.renamingId.set(letter.id);
  }

  async commitRename(letter: AdminLetterSummary, name: string): Promise<void> {
    this.renamingId.set(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = await firstValueFrom(
      this.http.patch<AdminLetterSummary>(`${API_BASE_URL}/api/admin/users/${this.userId()}/letters/${letter.id}/name`, { name: trimmed }),
    );
    this.letters.update((list) => list.map((l) => (l.id === letter.id ? updated : l)));
  }

  async duplicate(letter: AdminLetterSummary): Promise<void> {
    await firstValueFrom(this.http.post(`${API_BASE_URL}/api/admin/users/${this.userId()}/letters/${letter.id}/duplicate`, {}));
    const letters = await firstValueFrom(this.http.get<AdminLetterSummary[]>(`${API_BASE_URL}/api/admin/users/${this.userId()}/letters`));
    this.letters.set(letters);
  }

  async download(letter: AdminLetterSummary): Promise<void> {
    this.downloadingId.set(letter.id);
    try {
      const blob = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/api/admin/users/${this.userId()}/letters/${letter.id}/export/pdf`, { responseType: 'blob' }),
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${letter.name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloadingId.set(null);
    }
  }

  askDelete(letter: AdminLetterSummary): void {
    this.toDelete.set(letter);
  }

  async confirmDelete(letter: AdminLetterSummary): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/admin/users/${this.userId()}/letters/${letter.id}`));
    this.toDelete.set(null);
    this.letters.update((list) => list.filter((l) => l.id !== letter.id));
  }
}
