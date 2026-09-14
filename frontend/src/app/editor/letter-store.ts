import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { LetterDocument, LetterDto } from '../models/letter-document';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type ExportFormat = 'pdf' | 'docx' | 'txt' | 'html' | 'json';

const AUTOSAVE_DELAY_MS = 1500;

@Injectable({ providedIn: 'root' })
export class LetterStore {
  private readonly http = inject(HttpClient);

  readonly letterId = signal<string | null>(null);
  readonly name = signal('');
  readonly document = signal<LetterDocument | null>(null);
  readonly saveState = signal<SaveState>('idle');
  readonly loading = signal(false);
  readonly downloadingPdf = signal(false);
  readonly exportFormat = signal<ExportFormat>('pdf');
  readonly adminUserId = signal<string | null>(null);

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async load(id: string, adminUserId?: string): Promise<void> {
    this.adminUserId.set(adminUserId ?? null);
    this.loading.set(true);
    try {
      const letter = await firstValueFrom(this.http.get<LetterDto>(`${this.baseUrl()}/${id}`));
      this.letterId.set(letter.id);
      this.name.set(letter.name);
      this.document.set(letter.document);
      this.saveState.set('idle');
    } finally {
      this.loading.set(false);
    }
  }

  update(mutate: (doc: LetterDocument) => LetterDocument): void {
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
    const id = this.letterId();
    if (!id) return;
    this.downloadingPdf.set(true);
    try {
      await this.saveNow();
      const blob = await firstValueFrom(
        this.http.get(`${API_BASE_URL}/api/letters/${id}/export/${format}`, { responseType: 'blob' }),
      );
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${this.name() || 'lettre'}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      this.downloadingPdf.set(false);
    }
  }

  private baseUrl(): string {
    const admin = this.adminUserId();
    return admin ? `${API_BASE_URL}/api/admin/users/${admin}/letters` : `${API_BASE_URL}/api/letters`;
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), AUTOSAVE_DELAY_MS);
  }

  private async save(): Promise<void> {
    const id = this.letterId();
    const doc = this.document();
    if (!id || !doc) return;
    this.saveState.set('saving');
    try {
      await firstValueFrom(this.http.put(`${this.baseUrl()}/${id}`, doc));
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');
    }
  }
}
