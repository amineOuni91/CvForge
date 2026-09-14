import { Component, computed, input } from '@angular/core';
import { LetterDocument } from '../../../models/letter-document';
import { FONT_STACKS } from '../../font-stacks';
import { formatFullDate } from '../../format-date';
import { joinFields } from '../../join-fields';

@Component({
  selector: 'app-epure-letter-template',
  template: `
    @let doc = document();
    <div class="letter-page" [style.--letter-primary]="doc.settings.primaryColor" [style.--letter-secondary]="doc.settings.secondaryColor"
         [style.--letter-font]="fontStack()" [style.--letter-scale]="doc.settings.fontScale">
      <header style="margin-bottom: 28px;">
        <div class="letter-sender-name" style="font-weight: 400; letter-spacing: 0.03em; font-size: calc(14pt * var(--letter-scale, 1));">
          {{ senderName() }}
        </div>
        <div class="letter-sender-contact" style="margin-top: 4px;">{{ contactLine() }}</div>
      </header>

      @if (dateLine()) {
        <div class="letter-date" style="text-transform: uppercase; letter-spacing: 0.08em; font-size: calc(8.5pt * var(--letter-scale, 1)); margin-bottom: 20px;">
          {{ dateLine() }}
        </div>
      }

      @if (doc.recipient.recruiterName || doc.recipient.companyName) {
        <div class="letter-recipient" style="margin-bottom: 20px;">
          @if (doc.recipient.recruiterName) { <div>{{ doc.recipient.recruiterName }}</div> }
          @if (doc.recipient.companyName) { <div>{{ doc.recipient.companyName }}</div> }
          @if (doc.recipient.companyAddress) { <div>{{ doc.recipient.companyAddress }}</div> }
        </div>
      }

      @if (doc.subject) {
        <div class="letter-subject" style="font-weight: 400; text-transform: uppercase; letter-spacing: 0.05em; font-size: calc(9.5pt * var(--letter-scale, 1));">
          {{ subjectLabel() }} {{ doc.subject }}
        </div>
      }

      @if (doc.introduction) { <p>{{ doc.introduction }}</p> }
      @if (doc.motivation) { <p>{{ doc.motivation }}</p> }
      @if (doc.skills) { <p>{{ doc.skills }}</p> }
      @if (doc.conclusion) { <p>{{ doc.conclusion }}</p> }

      <div class="letter-signature" style="font-weight: 400;">{{ senderName() }}</div>
    </div>
  `,
})
export class EpureLetterTemplateComponent {
  readonly document = input.required<LetterDocument>();
  readonly lang = computed(() => this.document().settings.language);
  readonly fontStack = computed(() => FONT_STACKS[this.document().settings.fontFamily] ?? FONT_STACKS['system']);

  readonly senderName = computed(() => joinFields(' ', this.document().sender.firstName, this.document().sender.lastName));

  readonly contactLine = computed(() => {
    const s = this.document().sender;
    return joinFields(' · ', s.email, s.phone, s.city);
  });

  readonly dateLine = computed(() => {
    const doc = this.document();
    return joinFields(', ', doc.city, formatFullDate(doc.date, this.lang()));
  });

  readonly subjectLabel = computed(() => (this.lang() === 'fr' ? 'Objet :' : 'Subject:'));
}
