import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
    <main class="min-h-screen bg-slate-100 p-8 dark:bg-slate-900">
      <header class="mb-6 flex items-center justify-between">
        <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ 'dashboard.title' | t }}</h1>
        <div class="flex items-center gap-4 text-sm">
          <span class="text-slate-500 dark:text-slate-400">{{ auth.currentUser()?.email }}</span>
          <a routerLink="/profile" class="text-slate-600 hover:underline dark:text-slate-300">{{ 'profile.title' | t }}</a>
        </div>
      </header>

      <div class="mb-6 flex items-center gap-3">
        <button
          type="button"
          (click)="fileInput.click()"
          [disabled]="importing()"
          class="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {{ importing() ? 'Import en cours...' : '⇪ Importer un CV (JSON)' }}
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
      } @else if (cvs().length === 0) {
        <div class="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
          <p class="text-slate-500 dark:text-slate-400">{{ 'dashboard.empty' | t }}</p>
          <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">Créez votre premier CV ou importez-en un existant.</p>
          <button
            type="button"
            (click)="createCv()"
            class="mt-4 rounded bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700"
          >
            + Créer un CV
          </button>
        </div>
      } @else {
        <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {{ cvs().length }} CV · Dernière modification :
          <a [routerLink]="['/editor', mostRecent()!.id]" class="font-medium text-slate-700 hover:underline dark:text-slate-200">{{ mostRecent()?.name }}</a>
          ({{ mostRecent()?.updatedAt | date: 'dd/MM/yy HH:mm:ss' }})
        </p>
        <ul class="flex flex-wrap justify-center gap-4">
          <li class="w-40">
            <button
              type="button"
              (click)="createCv()"
              class="flex aspect-[210/297] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-600 dark:text-slate-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
            >
              <span class="text-2xl leading-none">+</span>
              <span class="text-xs font-medium">Nouveau CV</span>
            </button>
          </li>
          @for (cv of cvs(); track cv.id) {
            <li class="relative w-40 overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800">
              <a [routerLink]="['/editor', cv.id]" class="group block aspect-[210/297] bg-slate-100 ring-2 ring-transparent ring-inset transition-[box-shadow] hover:ring-indigo-500 dark:bg-slate-900 p-1.5">
                @if (thumbnails()[cv.id]; as thumb) {
                  <img [src]="thumb" class="h-full w-full rounded-sm object-cover object-top" alt="" />
                  <div
                    class="pointer-events-none fixed inset-0 z-40 invisible flex flex-col items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-hover:duration-200 group-hover:delay-300"
                  >
                    <div class="aspect-[210/297] max-h-[80vh] max-w-[90vw] overflow-hidden rounded-lg ring-2 ring-indigo-500 shadow-2xl">
                      <img [src]="thumb" class="h-full w-full object-cover object-top" alt="" />
                    </div>
                    <span class="rounded-full bg-white/90 px-4 py-1 text-sm font-medium text-slate-800 shadow">{{ cv.name }}</span>
                  </div>
                } @else {
                  <app-skeleton extraClass="h-full w-full rounded-sm" />
                }
              </a>
              <div class="p-2">
                @if (renamingId() === cv.id) {
                  <input
                    #renameInput
                    class="w-full rounded border border-slate-300 px-1 py-0.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    [value]="cv.name"
                    (keydown.enter)="commitRename(cv.id, renameInput.value)"
                    (blur)="commitRename(cv.id, renameInput.value)"
                  />
                } @else {
                  <a [routerLink]="['/editor', cv.id]" class="truncate text-sm font-medium text-slate-800 hover:underline dark:text-slate-100">{{ cv.name }}</a>
                }
                <p class="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">{{ cv.updatedAt | date: 'dd/MM/yy HH:mm:ss' }}</p>
                <div class="mt-1.5 flex gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <button type="button" (click)="startRename(cv.id)" title="Renommer" class="transition-colors hover:text-slate-800 dark:hover:text-slate-100">✎</button>
                  <button type="button" (click)="duplicate(cv.id)" title="Dupliquer" class="transition-colors hover:text-slate-800 dark:hover:text-slate-100">⧉</button>
                  <button type="button" (click)="downloadPdf(cv)" [disabled]="downloadingId() === cv.id" title="PDF" class="transition-colors hover:text-slate-800 dark:hover:text-slate-100">⤓</button>
                  <button type="button" (click)="askDelete(cv)" title="Supprimer" class="text-red-600 transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">🗑</button>
                </div>
              </div>
            </li>
          }
        </ul>
      }

      @if (toDelete(); as cv) {
        <app-modal (close)="toDelete.set(null)">
          <h2 class="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Supprimer « {{ cv.name }} » ?</h2>
          <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">Cette action est définitive.</p>
          <div class="flex justify-end gap-2">
            <button type="button" (click)="toDelete.set(null)" class="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600 dark:text-slate-200">Annuler</button>
            <button
              type="button"
              (click)="confirmDelete(cv.id)"
              class="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
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
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  readonly loading = signal(true);

  readonly mostRecent = computed(() =>
    this.cvs().reduce((a, b) => ((a.updatedAt > b.updatedAt ? a : b)), this.cvs()[0]),
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
    this.toDelete.set(cv);
  }

  async confirmDelete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_BASE_URL}/api/cvs/${id}`));
    this.toDelete.set(null);
    this.cvs.update((list) => list.filter((c) => c.id !== id));
    this.toast.success('CV supprimé.');
  }
}
