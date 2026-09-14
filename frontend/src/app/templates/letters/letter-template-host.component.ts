import { Component, input } from '@angular/core';
import { LetterDocument } from '../../models/letter-document';
import { ClassiqueLetterTemplateComponent } from './classique/classique-letter-template.component';
import { EpureLetterTemplateComponent } from './epure/epure-letter-template.component';
import { FormelLetterTemplateComponent } from './formel/formel-letter-template.component';

@Component({
  selector: 'app-letter-template-host',
  imports: [ClassiqueLetterTemplateComponent, EpureLetterTemplateComponent, FormelLetterTemplateComponent],
  template: `
    @switch (document().templateKey) {
      @case ('epure') { <app-epure-letter-template [document]="document()" /> }
      @case ('formel') { <app-formel-letter-template [document]="document()" /> }
      @default { <app-classique-letter-template [document]="document()" /> }
    }
  `,
})
export class LetterTemplateHostComponent {
  readonly document = input.required<LetterDocument>();
}
