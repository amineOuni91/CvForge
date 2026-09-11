import { Component, computed, input } from '@angular/core';
import { CvDocument } from '../../models/cv-document';
import { FONT_STACKS } from '../font-stacks';
import { formatMonth } from '../format-month';

const SECTION_LABELS: Record<string, { fr: string; en: string }> = {
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
  selector: 'app-modern-template',
  template: `
    @let doc = document();
    <div
      class="cv-page"
      [style.--cv-primary]="doc.settings.primaryColor"
      [style.--cv-secondary]="doc.settings.secondaryColor"
      [style.--cv-font]="fontStack()"
      [style.--cv-scale]="doc.settings.fontScale"
      [style.--cv-gap]="'14px'"
    >
      <header>
        <h1>{{ doc.personalInfo.firstName }} {{ doc.personalInfo.lastName }}</h1>
        <h2>{{ doc.personalInfo.jobTitle }}</h2>
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
                <div class="cv-section-title">{{ label('summary') }}</div>
                <p>{{ doc.summary }}</p>
              </section>
            }
          }
          @case ('experiences') {
            @if (doc.experiences.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('experiences') }}</div>
                @for (exp of doc.experiences; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ exp.position }} · {{ exp.company }}</div>
                    <div class="cv-entry-meta">
                      {{ formatDate(exp.startDate) }} → {{ exp.isCurrent ? (lang() === 'fr' ? 'Présent' : 'Present') : formatDate(exp.endDate) }}
                      · {{ exp.city }}
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
                    @for (tech of exp.technologies; track tech) { <span class="cv-tag">{{ tech }}</span> }
                  </div>
                }
              </section>
            }
          }
          @case ('projects') {
            @if (doc.projects.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('projects') }}</div>
                @for (project of doc.projects; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ project.name }}</div>
                    @if (project.description) { <p>{{ project.description }}</p> }
                    @for (tech of project.technologies; track tech) { <span class="cv-tag">{{ tech }}</span> }
                  </div>
                }
              </section>
            }
          }
          @case ('education') {
            @if (doc.education.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('education') }}</div>
                @for (edu of doc.education; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ edu.degree }} · {{ edu.school }}</div>
                    <div class="cv-entry-meta">{{ edu.graduationYear }}</div>
                  </div>
                }
              </section>
            }
          }
          @case ('skills') {
            @if (doc.skillCategories.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('skills') }}</div>
                @for (cat of doc.skillCategories; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ cat.name }}</div>
                    @for (skill of cat.skills; track skill) { <span class="cv-tag">{{ skill }}</span> }
                  </div>
                }
              </section>
            }
          }
          @case ('languages') {
            @if (doc.languages.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('languages') }}</div>
                @for (lang of doc.languages; track $index) {
                  <span class="cv-tag">{{ lang.name }} — {{ lang.level }}</span>
                }
              </section>
            }
          }
          @case ('certifications') {
            @if (doc.certifications.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('certifications') }}</div>
                @for (cert of doc.certifications; track $index) {
                  <div class="cv-entry">
                    <div class="cv-entry-title">{{ cert.name }} · {{ cert.issuer }}</div>
                    <div class="cv-entry-meta">{{ formatDate(cert.date) }}</div>
                  </div>
                }
              </section>
            }
          }
          @case ('interests') {
            @if (doc.interests.length) {
              <section class="cv-section">
                <div class="cv-section-title">{{ label('interests') }}</div>
                @for (interest of doc.interests; track interest) { <span class="cv-tag">{{ interest }}</span> }
              </section>
            }
          }
        }
      }
    </div>
  `,
})
export class ModernTemplateComponent {
  readonly document = input.required<CvDocument>();

  readonly lang = computed(() => this.document().settings.cvLanguage);
  readonly fontStack = computed(() => FONT_STACKS[this.document().settings.fontFamily] ?? FONT_STACKS['system']);

  readonly visibleSections = computed(() => {
    const doc = this.document();
    return doc.settings.sectionOrder.filter(
      (id) => id !== 'personalInfo' && !doc.settings.hiddenSections.includes(id),
    );
  });

  label(sectionId: string): string {
    return SECTION_LABELS[sectionId]?.[this.lang()] ?? sectionId;
  }

  formatDate(value: string | null | undefined): string {
    return formatMonth(value, this.lang());
  }
}
