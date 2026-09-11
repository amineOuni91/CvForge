import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../core/api-config';
import { CvDocument } from '../models/cv-document';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly http = inject(HttpClient);

  readonly available = signal(false);
  private statusChecked = false;

  async checkAvailability(): Promise<void> {
    if (this.statusChecked) return;
    this.statusChecked = true;
    try {
      const status = await firstValueFrom(this.http.get<{ available: boolean }>(`${API_BASE_URL}/api/ai/status`));
      this.available.set(status.available);
    } catch {
      this.available.set(false);
    }
  }

  async improveText(text: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ result: string }>(`${API_BASE_URL}/api/ai/improve-text`, { text }),
    );
    return res.result;
  }

  async generateBulletPoints(text: string): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.post<{ result: string[] }>(`${API_BASE_URL}/api/ai/bullet-points`, { text }),
    );
    return res.result;
  }

  async generateSummary(document: CvDocument): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ result: string }>(`${API_BASE_URL}/api/ai/summary`, { document }),
    );
    return res.result;
  }
}
