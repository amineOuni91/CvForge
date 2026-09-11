import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { CvDocument, CvDto } from '../models/cv-document';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type ExportFormat = 'pdf' | 'docx' | 'txt' | 'html' | 'json';

const AUTOSAVE_DELAY_MS = 1500;

@Injectable({ providedIn: 'root' })
export class CvStore {
  private readonly http = inject(HttpClient);

  readonly cvId = signal<string | null>(null);
  readonly name = signal('');
  readonly document = signal<CvDocument | null>(null);
  readonly saveState = signal<SaveState>('idle');
  readonly loading = signal(false);
  readonly downloadingPdf = signal(false);
  readonly exportFormat = signal<ExportFormat>('pdf');

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const cv = await firstValueFrom(this.http.get<CvDto>(`${API_BASE_URL}/api/cvs/${id}`));
      this.cvId.set(cv.id);
      this.name.set(cv.name);
      this.document.set(cv.document);
      this.saveState.set('idle');
    } finally {
      this.loading.set(false);
    }
  }

  update(mutate: (doc: CvDocument) => CvDocument): void {
    const current = this.document();
    if (!current) return;
    this.document.set(mutate(current));
    this.scheduleSave();
  }

  async saveNow(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.save();
  }

  async downloadExport(format: ExportFormat): Promise<void> {
    const id = this.cvId();
    if (!id) return;
    this.downloadingPdf.set(true);
    try {
      await this.saveNow();
      const blob = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/api/cvs/${id}/export/${format}`, { responseType: 'blob' }),
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${this.name() || 'cv'}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloadingPdf.set(false);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), AUTOSAVE_DELAY_MS);
  }

  private async save(): Promise<void> {
    const id = this.cvId();
    const doc = this.document();
    if (!id || !doc) return;
    this.saveState.set('saving');
    try {
      await firstValueFrom(this.http.put(`${API_BASE_URL}/api/cvs/${id}`, doc));
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');
    }
  }
}
