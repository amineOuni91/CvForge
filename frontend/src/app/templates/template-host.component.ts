import { Component, input } from '@angular/core';
import { CvDocument } from '../models/cv-document';
import { ModernTemplateComponent } from './modern/modern-template.component';
import { MinimalTemplateComponent } from './minimal/minimal-template.component';
import { ExecutiveTemplateComponent } from './executive/executive-template.component';
import { TechTemplateComponent } from './tech/tech-template.component';
import { AtsTemplateComponent } from './ats/ats-template.component';

@Component({
  selector: 'app-template-host',
  imports: [ModernTemplateComponent, MinimalTemplateComponent, ExecutiveTemplateComponent, TechTemplateComponent, AtsTemplateComponent],
  template: `
    @switch (document().templateKey) {
      @case ('minimal') {
        <app-minimal-template [document]="document()" />
      }
      @case ('executive') {
        <app-executive-template [document]="document()" />
      }
      @case ('tech') {
        <app-tech-template [document]="document()" />
      }
      @case ('ats') {
        <app-ats-template [document]="document()" />
      }
      @default {
        <app-modern-template [document]="document()" />
      }
    }
  `,
})
export class TemplateHostComponent {
  readonly document = input.required<CvDocument>();
}
