import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { JobOfferDto, LinkedCv, OfferDocument } from '../models/job-offer';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1500;

@Injectable({ providedIn: 'root' })
export class OfferStore {
  private readonly http = inject(HttpClient);

  readonly offerId = signal<string | null>(null);
  readonly document = signal<OfferDocument | null>(null);
  readonly cvs = signal<LinkedCv[]>([]);
  readonly saveState = signal<SaveState>('idle');
  readonly loading = signal(false);

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const offer = await firstValueFrom(this.http.get<JobOfferDto>(`${API_BASE_URL}/api/offers/${id}`));
      this.offerId.set(offer.id);
      this.document.set(offer.document);
      this.cvs.set(offer.cvs);
      this.saveState.set('idle');
    } finally {
      this.loading.set(false);
    }
  }

  async reloadCvs(): Promise<void> {
    const id = this.offerId();
    if (!id) return;
    const offer = await firstValueFrom(this.http.get<JobOfferDto>(`${API_BASE_URL}/api/offers/${id}`));
    this.cvs.set(offer.cvs);
  }

  update(mutate: (doc: OfferDocument) => OfferDocument): void {
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

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), AUTOSAVE_DELAY_MS);
  }

  private async save(): Promise<void> {
    const id = this.offerId();
    const doc = this.document();
    if (!id || !doc) return;
    this.saveState.set('saving');
    try {
      const saved = await firstValueFrom(this.http.put<JobOfferDto>(`${API_BASE_URL}/api/offers/${id}`, doc));
      this.cvs.set(saved.cvs);
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');
    }
  }
}
