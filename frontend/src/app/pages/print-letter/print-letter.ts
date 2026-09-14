import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { LetterDocument, LetterDto } from '../../models/letter-document';
import { LetterTemplateHostComponent } from '../../templates/letters/letter-template-host.component';

declare global {
  interface Window {
    __letter?: LetterDocument;
    __letterReady?: boolean;
  }
}

@Component({
  selector: 'app-print-letter',
  imports: [LetterTemplateHostComponent],
  template: `
    @if (document(); as doc) {
      <app-letter-template-host [document]="doc" />
    }
  `,
})
export class PrintLetter implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly document = signal<LetterDocument | null>(null);

  async ngOnInit(): Promise<void> {
    if (window.__letter) {
      this.document.set(window.__letter);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        const letter = await firstValueFrom(this.http.get<LetterDto>(`${API_BASE_URL}/api/letters/${id}`));
        this.document.set(letter.document);
      }
    }

    const sender = this.document()?.sender;
    const fullName = `${sender?.firstName ?? ''} ${sender?.lastName ?? ''}`.trim();
    document.title = fullName ? `${fullName} - Lettre de motivation` : 'Lettre de motivation';

    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    window.__letterReady = true;
  }
}
