import { Component, computed, inject } from '@angular/core';
import { CvStore } from '../cv-store';
import { TagInput } from '../../ui/tag-input';

@Component({
  selector: 'app-interests-section',
  imports: [TagInput],
  template: `
    <app-tag-input [values]="interests()" placeholder="Ajouter un centre d'intérêt..."
                    (valuesChange)="update($event)" />
  `,
})
export class InterestsSection {
  private readonly store = inject(CvStore);
  readonly interests = computed(() => this.store.document()?.interests ?? []);

  update(values: string[]): void {
    this.store.update((doc) => ({ ...doc, interests: values }));
  }
}
