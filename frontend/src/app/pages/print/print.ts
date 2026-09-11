import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { CvDocument, CvDto } from '../../models/cv-document';
import { TemplateHostComponent } from '../../templates/template-host.component';

declare global {
  interface Window {
    __cv?: CvDocument;
    __cvReady?: boolean;
  }
}

@Component({
  selector: 'app-print',
  imports: [TemplateHostComponent],
  template: `
    @if (document(); as doc) {
      <app-template-host [document]="doc" />
    }
  `,
})
export class Print implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly document = signal<CvDocument | null>(null);

  async ngOnInit(): Promise<void> {
    if (window.__cv) {
      this.document.set(window.__cv);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        const cv = await firstValueFrom(this.http.get<CvDto>(`${API_BASE_URL}/api/cvs/${id}`));
        this.document.set(cv.document);
      }
    }

    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    window.__cvReady = true;
  }
}
