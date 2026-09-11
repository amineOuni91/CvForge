import { Component, computed, input } from '@angular/core';
import { CvDocument } from '../../models/cv-document';
import { FONT_STACKS } from '../font-stacks';
import { formatMonth } from '../format-month';

const LABELS: Record<string, { fr: string; en: string }> = {
  summary: { fr: 'Profil', en: 'Profile' },
  experiences: { fr: 'Expérience', en: 'Experience' },
  projects: { fr: 'Projets', en: 'Projects' },
  education: { fr: 'Formation', en: 'Education' },
  skills: { fr: 'Compétences', en: 'Skills' },
  languages: { fr: 'Langues', en: 'Languages' },
  certifications: { fr: 'Certifications', en: 'Certifications' },
  interests: { fr: "Centres d'intérêt", en: 'Interests' },
};

@Component({
  selector: 'app-minimal-template',
  template: `
    @let doc = document();
    <div
      class="cv-page"
      [style.--cv-primary]="'#111827'"
      [style.--cv-secondary]="'#6b7280'"
      [style.--cv-font]="fontStack()"
      [style.--cv-scale]="doc.settings.fontScale"
    >
      <header style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
        <h1 style="font-weight: 400; letter-spacing: 0.03em;">{{ doc.personalInfo.firstName }} {{ doc.personalInfo.lastName }}</h1>
        <p style="color: #6b7280; margin: 2px 0 0;">{{ doc.personalInfo.jobTitle }}</p>
        <p class="cv-entry-meta">
          {{ doc.personalInfo.email }} · {{ doc.personalInfo.phone }} · {{ doc.personalInfo.city }}
          @if (doc.personalInfo.linkedIn) { · {{ doc.personalInfo.linkedIn }} }
          @if (doc.personalInfo.gitHub) { · {{ doc.personalInfo.gitHub }} }
        </p>
      </header>

      @for (sectionId of visibleSections(); track sectionId) {
        @switch (sectionId) {
          @case ('summary') {
            @if (doc.summary) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('summary') }}</div>
                <p>{{ doc.summary }}</p>
              </section>
            }
          }
          @case ('experiences') {
            @if (doc.experiences.length) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('experiences') }}</div>
                @for (exp of doc.experiences; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ exp.position }} — {{ exp.company }}</div>
                    <div class="cv-entry-meta">
                      {{ formatDate(exp.startDate) }} – {{ exp.isCurrent ? (lang() === 'fr' ? 'Présent' : 'Present') : formatDate(exp.endDate) }}
                    </div>
                    @if (exp.description) { <p>{{ exp.description }}</p> }
                    @if (exp.missions.length) {
                      <div class="cv-list-label">{{ lang() === 'fr' ? 'Missions' : 'Responsibilities' }}</div>
                      <ul class="cv-list">
                        @for (mission of exp.missions; track mission) { <li>{{ mission }}</li> }
                      </ul>
                    }
                    @if (exp.achievements.length) {
                      <div class="cv-list-label">{{ lang() === 'fr' ? 'Réalisations' : 'Achievements' }}</div>
                      <ul class="cv-list">
                        @for (achievement of exp.achievements; track achievement) { <li>{{ achievement }}</li> }
                      </ul>
                    }
                    @if (exp.technologies.length) { <p class="cv-entry-meta">{{ exp.technologies.join(', ') }}</p> }
                  </div>
                }
              </section>
            }
          }
          @case ('projects') {
            @if (doc.projects.length) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('projects') }}</div>
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
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('education') }}</div>
                @for (edu of doc.education; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ edu.degree }} — {{ edu.school }}</div>
                    <div class="cv-entry-meta">{{ formatDate(edu.startDate) }} – {{ formatDate(edu.endDate) }}</div>
                  </div>
                }
              </section>
            }
          }
          @case ('skills') {
            @if (doc.skillCategories.length) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('skills') }}</div>
                @for (cat of doc.skillCategories; track $index) {
                  <p><strong>{{ cat.name }}</strong> — {{ cat.skills.join(', ') }}</p>
                }
              </section>
            }
          }
          @case ('languages') {
            @if (doc.languages.length) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('languages') }}</div>
                <p>{{ languagesText() }}</p>
              </section>
            }
          }
          @case ('certifications') {
            @if (doc.certifications.length) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('certifications') }}</div>
                @for (cert of doc.certifications; track $index) {
                  <p>{{ cert.name }} — {{ cert.issuer }} ({{ formatDate(cert.date) }})</p>
                }
              </section>
            }
          }
          @case ('interests') {
            @if (doc.interests.length) {
              <section class="cv-section">
                <div style="font-size: 9pt; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 6px;">{{ label('interests') }}</div>
                <p>{{ doc.interests.join(', ') }}</p>
              </section>
            }
          }
        }
      }
    </div>
  `,
})
export class MinimalTemplateComponent {
  readonly document = input.required<CvDocument>();
  readonly lang = computed(() => this.document().settings.cvLanguage);
  readonly fontStack = computed(() => FONT_STACKS[this.document().settings.fontFamily] ?? FONT_STACKS['system']);

  readonly visibleSections = computed(() => {
    const doc = this.document();
    return doc.settings.sectionOrder.filter((id) => id !== 'personalInfo' && !doc.settings.hiddenSections.includes(id));
  });

  readonly languagesText = computed(() =>
    this.document().languages.map((l) => `${l.name} (${l.level})`).join(' · '),
  );

  label(sectionId: string): string {
    return LABELS[sectionId]?.[this.lang()] ?? sectionId;
  }

  formatDate(value: string | null | undefined): string {
    return formatMonth(value, this.lang());
  }
}
