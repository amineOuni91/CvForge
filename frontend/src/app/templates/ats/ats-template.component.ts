import { Component, computed, input } from '@angular/core';
import { CvDocument } from '../../models/cv-document';
import { formatMonth } from '../format-month';

const LABELS: Record<string, { fr: string; en: string }> = {
  summary: { fr: 'PROFIL', en: 'PROFILE' },
  experiences: { fr: 'EXPERIENCE', en: 'EXPERIENCE' },
  projects: { fr: 'PROJETS', en: 'PROJECTS' },
  education: { fr: 'FORMATION', en: 'EDUCATION' },
  skills: { fr: 'COMPETENCES', en: 'SKILLS' },
  languages: { fr: 'LANGUES', en: 'LANGUAGES' },
  certifications: { fr: 'CERTIFICATIONS', en: 'CERTIFICATIONS' },
  interests: { fr: "CENTRES D'INTERET", en: 'INTERESTS' },
};

/**
 * ATS-safe by design: single column, plain text, no color, no tags/icons —
 * everything a parser can misread is deliberately left out (Settings.PrimaryColor
 * is intentionally NOT applied here, unlike the other 4 templates).
 */
@Component({
  selector: 'app-ats-template',
  template: `
    @let doc = document();
    <div class="cv-page" [style.--cv-scale]="doc.settings.fontScale" style="font-family: Arial, sans-serif;">
      <header>
        <h1 style="color: #000;">{{ doc.personalInfo.firstName }} {{ doc.personalInfo.lastName }}</h1>
        <p>{{ doc.personalInfo.jobTitle }}</p>
        <p>{{ doc.personalInfo.email }} | {{ doc.personalInfo.phone }} | {{ doc.personalInfo.city }}, {{ doc.personalInfo.country }}</p>
        @if (doc.personalInfo.linkedIn) { <p>{{ doc.personalInfo.linkedIn }}</p> }
        @if (doc.personalInfo.gitHub) { <p>{{ doc.personalInfo.gitHub }}</p> }
      </header>

      @for (sectionId of visibleSections(); track sectionId) {
        @switch (sectionId) {
          @case ('summary') {
            @if (doc.summary) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('summary') }}</div>
                <p>{{ doc.summary }}</p>
              </section>
            }
          }
          @case ('experiences') {
            @if (doc.experiences.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('experiences') }}</div>
                @for (exp of doc.experiences; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ exp.position }}, {{ exp.company }} ({{ exp.city }})</div>
                    <div>{{ formatDate(exp.startDate) }} - {{ exp.isCurrent ? (lang() === 'fr' ? 'Present' : 'Present') : formatDate(exp.endDate) }}</div>
                    @if (exp.description) { <p>{{ exp.description }}</p> }
                    @if (exp.missions.length) {
                      <p>{{ lang() === 'fr' ? 'Missions' : 'Responsibilities' }} :</p>
                      @for (mission of exp.missions; track mission) { <p>- {{ mission }}</p> }
                    }
                    @if (exp.achievements.length) {
                      <p>{{ lang() === 'fr' ? 'Réalisations' : 'Achievements' }} :</p>
                      @for (achievement of exp.achievements; track achievement) { <p>- {{ achievement }}</p> }
                    }
                    @if (exp.technologies.length) { <p>Technologies : {{ exp.technologies.join(', ') }}</p> }
                  </div>
                }
              </section>
            }
          }
          @case ('projects') {
            @if (doc.projects.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('projects') }}</div>
                @for (project of doc.projects; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ project.name }}</div>
                    @if (project.description) { <p>{{ project.description }}</p> }
                  </div>
                }
              </section>
            }
          }
          @case ('education') {
            @if (doc.education.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('education') }}</div>
                @for (edu of doc.education; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ edu.degree }}, {{ edu.school }}</div>
                    <div>{{ formatDate(edu.startDate) }} - {{ formatDate(edu.endDate) }}</div>
                  </div>
                }
              </section>
            }
          }
          @case ('skills') {
            @if (doc.skillCategories.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('skills') }}</div>
                @for (cat of doc.skillCategories; track $index) {
                  <p>{{ cat.name }}: {{ cat.skills.join(', ') }}</p>
                }
              </section>
            }
          }
          @case ('languages') {
            @if (doc.languages.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('languages') }}</div>
                @for (l of doc.languages; track $index) { <p>{{ l.name }}: {{ l.level }}</p> }
              </section>
            }
          }
          @case ('certifications') {
            @if (doc.certifications.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('certifications') }}</div>
                @for (cert of doc.certifications; track $index) { <p>{{ cert.name }}, {{ cert.issuer }} ({{ formatDate(cert.date) }})</p> }
              </section>
            }
          }
          @case ('interests') {
            @if (doc.interests.length) {
              <section class="cv-section">
                <div style="font-weight: 700; border-bottom: 1px solid #000;">{{ label('interests') }}</div>
                <p>{{ doc.interests.join(', ') }}</p>
              </section>
            }
          }
        }
      }
    </div>
  `,
})
export class AtsTemplateComponent {
  readonly document = input.required<CvDocument>();
  readonly lang = computed(() => this.document().settings.cvLanguage);

  readonly visibleSections = computed(() => {
    const doc = this.document();
    return doc.settings.sectionOrder.filter((id) => id !== 'personalInfo' && !doc.settings.hiddenSections.includes(id));
  });

  label(sectionId: string): string {
    return LABELS[sectionId]?.[this.lang()] ?? sectionId;
  }

  formatDate(value: string | null | undefined): string {
    return formatMonth(value, this.lang());
  }
}
