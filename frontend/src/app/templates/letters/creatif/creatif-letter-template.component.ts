import { Component, computed, input } from '@angular/core';
import { LetterDocument } from '../../../models/letter-document';
import { FONT_STACKS } from '../../font-stacks';
import { formatFullDate } from '../../format-date';
import { joinFields } from '../../join-fields';

@Component({
  selector: 'app-creatif-letter-template',
  template: `
    @let doc = document();
    <div class="letter-page" style="padding-top: 0;" [style.--letter-primary]="doc.settings.primaryColor" [style.--letter-secondary]="doc.settings.secondaryColor"
         [style.--letter-font]="fontStack()" [style.--letter-scale]="doc.settings.fontScale">
      <header [style.background]="doc.settings.primaryColor" style="color: white; margin: -20mm -20mm 20px -20mm; padding: 20mm 20mm 16px;">
        <div style="font-weight: 700; font-size: calc(15pt * var(--letter-scale, 1));">{{ senderName() }}</div>
        @if (doc.sender.jobTitle) { <div style="opacity: 0.9;">{{ doc.sender.jobTitle }}</div> }
        <div style="opacity: 0.85; font-size: calc(9.5pt * var(--letter-scale, 1)); margin-top: 4px;">{{ contactLine() }}</div>
      </header>

      <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
        <div class="letter-recipient">
          @if (doc.recipient.recruiterName) { <div>{{ doc.recipient.recruiterName }}</div> }
          @if (doc.recipient.companyName) { <div>{{ doc.recipient.companyName }}</div> }
          @if (doc.recipient.companyAddress) { <div>{{ doc.recipient.companyAddress }}</div> }
        </div>
        @if (dateLine()) { <div class="letter-date">{{ dateLine() }}</div> }
      </div>

      @if (doc.subject) {
        <div class="letter-subject" style="border-left: 4px solid var(--letter-primary); padding-left: 10px;">
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
export class CreatifLetterTemplateComponent {
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
