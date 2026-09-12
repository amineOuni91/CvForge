import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `<div class="animate-pulse rounded bg-slate-200 dark:bg-slate-700" [class]="extraClass()"></div>`,
})
export class Skeleton {
  readonly extraClass = input('');
}
