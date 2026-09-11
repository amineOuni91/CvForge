import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `<div class="animate-pulse rounded bg-slate-200" [class]="extraClass()"></div>`,
})
export class Skeleton {
  readonly extraClass = input('');
}
