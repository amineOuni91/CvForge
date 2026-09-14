import { Component, computed, input } from '@angular/core';
import { LetterDocument } from '../../../models/letter-document';
import { FONT_STACKS } from '../../font-stacks';
import { formatFullDate } from '../../format-date';
import { joinFields } from '../../join-fields';

@Component({
  selector: 'app-classique-letter-template',
  template: `
    @let doc = document();
    <div class="letter-page" [style.--letter-primary]="doc.settings.primaryColor" [style.--letter-secondary]="doc.settings.secondaryColor"
         [style.--letter-font]="fontStack()" [style.--letter-scale]="doc.settings.fontScale">
      <header style="margin-bottom: 16px;">
        <div class="letter-sender-name" style="font-size: calc(13pt * var(--letter-scale, 1));">{{ senderName() }}</div>
        @if (doc.sender.jobTitle) { <div>{{ doc.sender.jobTitle }}</div> }
        <div class="letter-sender-contact">{{ contactLine() }}</div>
      </header>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div class="letter-recipient">
          @if (doc.recipient.recruiterName) { <div>{{ doc.recipient.recruiterName }}</div> }
          @if (doc.recipient.companyName) { <div>{{ doc.recipient.companyName }}</div> }
          @if (doc.recipient.companyAddress) { <div>{{ doc.recipient.companyAddress }}</div> }
        </div>
        @if (dateLine()) { <div class="letter-date">{{ dateLine() }}</div> }
      </div>

      @if (doc.subject) {
        <div class="letter-subject" style="text-align: center; border-bottom: 1px solid var(--letter-secondary); padding-bottom: 6px;">
          {{ subjectLabel() }} {{ doc.subject }}
        </div>
      }

      @if (doc.introduction) { <p>{{ doc.introduction }}</p> }
      @if (doc.motivation) { <p>{{ doc.motivation }}</p> }
      @if (doc.skills) { <p>{{ doc.skills }}</p> }
      @if (doc.conclusion) { <p>{{ doc.conclusion }}</p> }

      <div class="letter-signature">{{ senderName() }}</div>
    </div>
  `,
})
export class ClassiqueLetterTemplateComponent {
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
