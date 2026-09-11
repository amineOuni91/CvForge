import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { TPipe } from '../../core/t.pipe';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { CvDocument, CvSummary } from '../../models/cv-document';
import { Modal } from '../../ui/modal';
import { Skeleton } from '../../ui/skeleton';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TPipe, DatePipe, Modal, Skeleton],
  template: `
    <main class="min-h-screen bg-slate-100 p-8">
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-xl font-bold text-slate-800">{{ 'dashboard.title' | t }}</h1>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-slate-500">{{ auth.currentUser()?.email }}</span>
          <a routerLink="/profile" class="text-slate-600 hover:underline">{{ 'profile.title' | t }}</a>
        </div>
      </header>

      <div class="mb-6 flex items-center gap-3">
        <button
          type="button"
          (click)="createCv()"
          class="rounded bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700"
        >
          + Créer un CV
        </button>
        <button
          type="button"
          (click)="fileInput.click()"
          [disabled]="importing()"
          class="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {{ importing() ? 'Import en cours...' : '⇪ Importer un CV (JSON)' }}
        </button>
        <input #fileInput type="file" accept=".json" class="hidden" (change)="onFileSelected($event)" />
      </div>

      @if (importError(); as msg) {
        <p class="mb-4 text-sm text-red-600">{{ msg }}</p>
      }

      @if (loading()) {
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <li class="overflow-hidden rounded-lg bg-white shadow-sm">
              <app-skeleton extraClass="aspect-[210/297] w-full rounded-none" />
              <div class="space-y-2 p-3">
                <app-skeleton extraClass="h-4 w-2/3" />
                <app-skeleton extraClass="h-3 w-1/3" />
              </div>
            </li>
          }
        </ul>
      } @else if (cvs().length === 0) {
        <div class="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p class="text-slate-500">{{ 'dashboard.empty' | t }}</p>
          <p class="mt-1 text-sm text-slate-400">Créez votre premier CV ou importez-en un existant.</p>
        </div>
      } @else {
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (cv of cvs(); track cv.id) {
            <li class="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md">
              <a [routerLink]="['/editor', cv.id]" class="block aspect-[210/297] bg-slate-50">
                @if (thumbnails()[cv.id]; as thumb) {
                  <img [src]="thumb" class="h-full w-full object-cover object-top" alt="" />
                } @else {
                  <app-skeleton extraClass="h-full w-full rounded-none" />
                }
              </a>
              <div class="p-3">
                @if (renamingId() === cv.id) {
                  <input
                    #renameInput
                    class="w-full rounded border border-slate-300 px-1 py-0.5 text-sm font-medium"
                    [value]="cv.name"
                    (keydown.enter)="commitRename(cv.id, renameInput.value)"
                    (blur)="commitRename(cv.id, renameInput.value)"
                  />
                } @else {
                  <a [routerLink]="['/editor', cv.id]" class="font-medium text-slate-800 hover:underline">{{ cv.name }}</a>
                }
                <p class="mt-1 text-xs text-slate-400">Mis à jour {{ cv.updatedAt | date: 'dd/MM/yyyy HH:mm:ss' }}</p>
                <div class="mt-2 flex gap-3 text-xs text-slate-500">
                  <button type="button" (click)="startRename(cv.id)" title="Renommer" class="transition-colors hover:text-slate-800">✎</button>
                  <button type="button" (click)="duplicate(cv.id)" title="Dupliquer" class="transition-colors hover:text-slate-800">⧉</button>
                  <button type="button" (click)="downloadPdf(cv)" [disabled]="downloadingId() === cv.id" title="PDF" class="transition-colors hover:text-slate-800">⤓</button>
                  <button type="button" (click)="askDelete(cv)" title="Supprimer" class="text-red-600 transition-colors hover:text-red-800">🗑</button>
                </div>
              </div>
            </li>
          }
        </ul>
      }

      @if (toDelete(); as cv) {
        <app-modal (close)="toDelete.set(null)">
          <h2 class="mb-2 text-lg font-semibold text-slate-800">Supprimer « {{ cv.name }} » ?</h2>
          <p class="mb-3 text-sm text-slate-500">Cette action est définitive. Tapez le nom du CV pour confirmer.</p>
          <input
            #confirmInput
            class="mb-4 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            [placeholder]="cv.name"
            (input)="deleteConfirmText.set(confirmInput.value)"
          />
          <div class="flex justify-end gap-2">
            <button type="button" (click)="toDelete.set(null)" class="rounded border border-slate-300 px-3 py-1.5 text-sm">Annuler</button>
            <button
              type="button"
              [disabled]="deleteConfirmText() !== cv.name"
              (click)="confirmDelete(cv.id)"
              class="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              Supprimer
            </button>
          </div>
        </app-modal>
      }
    </main>
  `,
})
export class Dashboard implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly cvs = signal<CvSummary[]>([]);
  readonly thumbnails = signal<Record<string, string>>({});
  readonly renamingId = signal<string | null>(null);
  readonly downloadingId = signal<string | null>(null);
  readonly toDelete = signal<CvSummary | null>(null);
  readonly deleteConfirmText = signal('');
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  ngOnDestroy(): void {
    for (const url of Object.values(this.thumbnails())) URL.revokeObjectURL(url);
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const cvs = await firstValueFrom(this.http.get<CvSummary[]>(`${API_BASE_URL}/api/cvs`));
      this.cvs.set(cvs);
      for (const cv of cvs) this.loadThumbnail(cv.id);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadThumbnail(id: string): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/api/cvs/${id}/thumbnail`, { responseType: 'blob' }),
      );
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
      const document = await firstValueFrom(this.http.post<CvDocument>(`${API_BASE_URL}/api/import`, formData));
      const created = await firstValueFrom(
        this.http.post<CvSummary>(`${API_BASE_URL}/api/cvs`, { name: file.name.replace(/\.(pdf|docx)$/i, ''), document }),
      );
      // the editor is also the field-by-field verification screen: every imported value is
      // editable there with a live preview, before the user saves anything for real
      await this.router.navigate(['/editor', created.id]);
    } catch (err) {
      const message = (err as { error?: { error?: string } })?.error?.error;
      this.importError.set(message ?? "Échec de l'import. Vérifiez le fichier et réessayez.");
    } finally {
      this.importing.set(false);
    }
  }

  async createCv(): Promise<void> {
    const created = await firstValueFrom(this.http.post<CvSummary>(`${API_BASE_URL}/api/cvs`, {}));
    await this.router.navigate(['/editor', created.id]);
  }

  startRename(id: string): void {
    this.renamingId.set(id);
  }

  async commitRename(id: string, name: string): Promise<void> {
    this.renamingId.set(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = await firstValueFrom(
      this.http.patch<CvSummary>(`${API_BASE_URL}/api/cvs/${id}/name`, { name: trimmed }),
    );
    this.cvs.update((list) => list.map((c) => (c.id === id ? updated : c)));
  }

  async duplicate(id: string): Promise<void> {
    await firstValueFrom(this.http.post<CvSummary>(`${API_BASE_URL}/api/cvs/${id}/duplicate`, {}));
    await this.reload();
    this.toast.success('CV dupliqué.');
  }

  async downloadPdf(cv: CvSummary): Promise<void> {
    this.downloadingId.set(cv.id);
    try {
      const blob = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/api/cvs/${cv.id}/export/pdf`, { responseType: 'blob' }),
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${cv.name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.toast.error('Échec de la génération du PDF.');
    } finally {
      this.downloadingId.set(null);
    }
  }

  askDelete(cv: CvSummary): void {
    this.deleteConfirmText.set('');
    this.toDelete.set(cv);
  }

  async confirmDelete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/cvs/${id}`));
    this.toDelete.set(null);
    this.cvs.update((list) => list.filter((c) => c.id !== id));
    this.toast.success('CV supprimé.');
  }
}
