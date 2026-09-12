import { Component, ElementRef, afterRenderEffect, computed, effect, input, signal, viewChild } from '@angular/core';
import { CvDocument } from '../models/cv-document';
import { TemplateHostComponent } from '../templates/template-host.component';

const A4_PAGE_MARKER =
  'repeating-linear-gradient(to bottom, transparent 0, transparent calc(297mm - 1px), #94a3b8 calc(297mm - 1px), #94a3b8 297mm)';

// CSS mm is defined relative to the 96dpi reference pixel (96px = 1in = 25.4mm), not the OS/monitor DPI.
const PX_PER_MM = 96 / 25.4;
const A4_HEIGHT_MM = 297;

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
        <span class="ml-4 text-slate-500">{{ currentPage() }}/{{ pageCount() }} pages</span>
      </div>
      <div
        #scrollContainer
        class="flex-1 overflow-auto bg-slate-200 p-6"
        [class.fixed]="fullscreen()"
        [class.inset-0]="fullscreen()"
        [class.z-50]="fullscreen()"
        (scroll)="scrollTopPx.set(scrollContainer.scrollTop)"
      >
        @if (document(); as doc) {
          <div
            class="relative mx-auto shadow-lg"
            style="width: 210mm; transform-origin: top center"
            [style.transform]="'scale(' + zoom() + ')'"
          >
            <div #pageAnchor>
              <app-template-host [document]="doc" />
            </div>
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

  private readonly pageAnchor = viewChild<ElementRef<HTMLDivElement>>('pageAnchor');
  private readonly contentHeightPx = signal(0);
  // offsetHeight rounds to the nearest integer px, which can tip a content height that's
  // exactly one page tall (e.g. an empty CV at min-height: 297mm) over the boundary — a
  // couple of px of tolerance absorbs that without masking any real overflow onto page 2+.
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.contentHeightPx() - 2) / (A4_HEIGHT_MM * PX_PER_MM))),
  );

  // Scroll happens in the transformed (scaled) visual space, so the page height it's compared
  // against must be scaled by the same zoom factor.
  readonly scrollTopPx = signal(0);
  readonly currentPage = computed(() => {
    const pageHeightScaled = A4_HEIGHT_MM * PX_PER_MM * this.zoom();
    return Math.min(this.pageCount(), Math.floor(this.scrollTopPx() / pageHeightScaled) + 1);
  });

  constructor() {
    // ResizeObserver covers resizes not tied to a document() change (e.g. web font finishing
    // load). It's re-armed if the anchor element itself is ever replaced.
    effect((onCleanup) => {
      const el = this.pageAnchor()?.nativeElement;
      if (!el) return;
      const observer = new ResizeObserver(() => this.contentHeightPx.set(el.offsetHeight));
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    });

    // Re-measure on every content edit. A plain effect() runs as soon as document() changes,
    // which is before Angular has patched the DOM for that change — afterRenderEffect defers
    // to after the render, so the height read here reflects the new content.
    afterRenderEffect(() => {
      this.document();
      const el = this.pageAnchor()?.nativeElement;
      if (el) this.contentHeightPx.set(el.offsetHeight);
    });
  }

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
