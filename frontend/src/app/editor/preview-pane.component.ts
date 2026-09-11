import { Component, computed, input, signal } from '@angular/core';
import { CvDocument } from '../models/cv-document';
import { TemplateHostComponent } from '../templates/template-host.component';

const A4_PAGE_MARKER =
  'repeating-linear-gradient(to bottom, transparent 0, transparent calc(297mm - 1px), #94a3b8 calc(297mm - 1px), #94a3b8 297mm)';

@Component({
  selector: 'app-preview-pane',
  imports: [TemplateHostComponent],
  template: `
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-center gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <button type="button" (click)="zoomOut()" class="rounded px-2 py-1 hover:bg-slate-100">−</button>
        <span class="w-12 text-center text-slate-600">{{ zoomPercent() }}%</span>
        <button type="button" (click)="zoomIn()" class="rounded px-2 py-1 hover:bg-slate-100">+</button>
        <button type="button" (click)="toggleFullscreen()" class="ml-4 rounded px-2 py-1 hover:bg-slate-100">
          {{ fullscreen() ? '✕ Quitter le plein écran' : '⛶ Plein écran' }}
        </button>
      </div>
      <div
        class="flex-1 overflow-auto bg-slate-200 p-6"
        [class.fixed]="fullscreen()"
        [class.inset-0]="fullscreen()"
        [class.z-50]="fullscreen()"
      >
        @if (document(); as doc) {
          <div
            class="relative mx-auto shadow-lg"
            style="width: 210mm; transform-origin: top center"
            [style.transform]="'scale(' + zoom() + ')'"
          >
            <app-template-host [document]="doc" />
            <div class="pointer-events-none absolute inset-0" [style.background-image]="pageMarker"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PreviewPane {
  readonly document = input.required<CvDocument | null>();

  readonly zoom = signal(1);
  readonly fullscreen = signal(false);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  readonly pageMarker = A4_PAGE_MARKER;

  zoomIn(): void {
    this.zoom.set(Math.min(1.5, Math.round((this.zoom() + 0.1) * 10) / 10));
  }

  zoomOut(): void {
    this.zoom.set(Math.max(0.4, Math.round((this.zoom() - 0.1) * 10) / 10));
  }

  toggleFullscreen(): void {
    this.fullscreen.set(!this.fullscreen());
  }
}
