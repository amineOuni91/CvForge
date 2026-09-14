import { Component, computed, input } from '@angular/core';
import { LetterDocument } from '../../../models/letter-document';
import { FONT_STACKS } from '../../font-stacks';
import { formatFullDate } from '../../format-date';
import { joinFields } from '../../join-fields';

@Component({
  selector: 'app-formel-letter-template',
  template: `
    @let doc = document();
    <div class="letter-page" [style.--letter-primary]="doc.settings.primaryColor" [style.--letter-secondary]="doc.settings.secondaryColor"
         [style.--letter-font]="fontStack()" [style.--letter-scale]="doc.settings.fontScale">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <div class="letter-sender-name">{{ senderName() }}</div>
          <div class="letter-sender-contact">{{ contactLine() }}</div>
        </div>
        <div class="letter-recipient" style="text-align: right;">
          @if (doc.recipient.recruiterName) { <div>{{ doc.recipient.recruiterName }}</div> }
          @if (doc.recipient.companyName) { <div>{{ doc.recipient.companyName }}</div> }
          @if (doc.recipient.companyAddress) { <div>{{ doc.recipient.companyAddress }}</div> }
        </div>
      </div>

      @if (dateLine()) { <div class="letter-date" style="text-align: right; margin-bottom: 20px;">{{ dateLine() }}</div> }

      @if (doc.subject) {
        <div class="letter-subject" style="text-transform: uppercase; font-size: calc(10pt * var(--letter-scale, 1));">
          {{ subjectLabel() }} {{ doc.subject }}
        </div>
      }

      <p>{{ lang() === 'fr' ? 'Madame, Monsieur,' : 'Dear Sir or Madam,' }}</p>

      @if (doc.introduction) { <p>{{ doc.introduction }}</p> }
      @if (doc.motivation) { <p>{{ doc.motivation }}</p> }
      @if (doc.skills) { <p>{{ doc.skills }}</p> }
      @if (doc.conclusion) { <p>{{ doc.conclusion }}</p> }

      <p>
        {{ lang() === 'fr'
          ? "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
          : 'Sincerely,' }}
      </p>

      <div class="letter-signature">{{ senderName() }}</div>
    </div>
  `,
})
export class FormelLetterTemplateComponent {
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
