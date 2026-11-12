import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="close.emit()">
      <div [class]="width() + ' rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800'" (click)="$event.stopPropagation()">
        <ng-content />
      </div>
    </div>
  `,
})
export class Modal {
  readonly width = input('w-96');
  readonly close = output<void>();
}
