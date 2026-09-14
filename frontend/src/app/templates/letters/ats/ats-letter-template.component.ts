import { Component, computed, input } from '@angular/core';
import { LetterDocument } from '../../../models/letter-document';
import { FONT_STACKS } from '../../font-stacks';
import { formatFullDate } from '../../format-date';
import { joinFields } from '../../join-fields';

@Component({
  selector: 'app-ats-letter-template',
  template: `
    @let doc = document();
    <div class="letter-page" style="color: #000;" [style.--letter-font]="fontStack()" [style.--letter-scale]="doc.settings.fontScale">
      <div style="font-weight: 700;">{{ senderName() }}</div>
      @if (doc.sender.jobTitle) { <div>{{ doc.sender.jobTitle }}</div> }
      <div style="color: #000;">{{ contactLine() }}</div>

      @if (doc.recipient.recruiterName || doc.recipient.companyName) {
        <div style="margin-top: 16px; color: #000;">
          @if (doc.recipient.recruiterName) { <div>{{ doc.recipient.recruiterName }}</div> }
          @if (doc.recipient.companyName) { <div>{{ doc.recipient.companyName }}</div> }
          @if (doc.recipient.companyAddress) { <div>{{ doc.recipient.companyAddress }}</div> }
        </div>
      }

      @if (dateLine()) { <div style="margin-top: 16px; color: #000;">{{ dateLine() }}</div> }

      @if (doc.subject) {
        <p style="font-weight: 700; margin-top: 16px;">{{ subjectLabel() }} {{ doc.subject }}</p>
      }

      @if (doc.introduction) { <p>{{ doc.introduction }}</p> }
      @if (doc.motivation) { <p>{{ doc.motivation }}</p> }
      @if (doc.skills) { <p>{{ doc.skills }}</p> }
      @if (doc.conclusion) { <p>{{ doc.conclusion }}</p> }

      <p style="font-weight: 700;">{{ senderName() }}</p>
    </div>
  `,
})
export class AtsLetterTemplateComponent {
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
