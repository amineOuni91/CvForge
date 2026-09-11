import { Component, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div class="w-96 rounded-lg bg-white p-6 shadow-xl" (click)="$event.stopPropagation()">
        <ng-content />
      </div>
    </div>
  `,
})
export class Modal {
  readonly close = output<void>();
}
