import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-host',
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white shadow-lg transition-all animate-[fade-in_0.15s_ease-out]"
          [class.bg-slate-800]="toast.kind === 'success'"
          [class.bg-red-600]="toast.kind === 'error'"
        >
          {{ toast.message }}
          <button type="button" (click)="toasts.dismiss(toast.id)" class="opacity-70 hover:opacity-100">✕</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes fade-in {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
}
