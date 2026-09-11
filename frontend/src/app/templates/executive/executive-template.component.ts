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

const SIDEBAR_SECTIONS = ['skills', 'languages', 'certifications', 'interests'];
const MAIN_SECTIONS = ['summary', 'experiences', 'projects', 'education'];

@Component({
  selector: 'app-executive-template',
  template: `
    @let doc = document();
    <div
      class="cv-page"
      style="padding: 0;"
      [style.--cv-primary]="doc.settings.primaryColor"
      [style.--cv-secondary]="doc.settings.secondaryColor"
      [style.--cv-font]="fontStack()"
      [style.--cv-scale]="doc.settings.fontScale"
    >
      <header style="background: var(--cv-primary); color: white; padding: 14mm 12mm 10mm;">
        <h1 style="color: white;">{{ doc.personalInfo.firstName }} {{ doc.personalInfo.lastName }}</h1>
        <h2 style="color: #ffffffcc;">{{ doc.personalInfo.jobTitle }}</h2>
      </header>

      <div style="display: flex;">
        <aside style="width: 35%; padding: 10mm 8mm; background: #f8fafc;">
          <p class="cv-entry-meta">{{ doc.personalInfo.email }}</p>
          <p class="cv-entry-meta">{{ doc.personalInfo.phone }}</p>
          <p class="cv-entry-meta">{{ doc.personalInfo.city }}, {{ doc.personalInfo.country }}</p>
          @if (doc.personalInfo.linkedIn) { <p class="cv-entry-meta">{{ doc.personalInfo.linkedIn }}</p> }
          @if (doc.personalInfo.gitHub) { <p class="cv-entry-meta">{{ doc.personalInfo.gitHub }}</p> }

          @for (sectionId of sidebarSections(); track sectionId) {
            @switch (sectionId) {
              @case ('skills') {
                @if (doc.skillCategories.length) {
                  <section class="cv-section">
                    <div class="cv-section-title">{{ label('skills') }}</div>
                    @for (cat of doc.skillCategories; track $index) {
                      <p class="cv-entry-title" style="font-size: 9.5pt;">{{ cat.name }}</p>
                      @for (skill of cat.skills; track skill) { <span class="cv-tag">{{ skill }}</span> }
                    }
                  </section>
                }
              }
              @case ('languages') {
                @if (doc.languages.length) {
                  <section class="cv-section">
                    <div class="cv-section-title">{{ label('languages') }}</div>
                    @for (l of doc.languages; track $index) { <p>{{ l.name }} — {{ l.level }}</p> }
                  </section>
                }
              }
              @case ('certifications') {
                @if (doc.certifications.length) {
                  <section class="cv-section">
                    <div class="cv-section-title">{{ label('certifications') }}</div>
                    @for (cert of doc.certifications; track $index) { <p>{{ cert.name }}</p> }
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
        </aside>

        <main style="width: 65%; padding: 10mm 8mm;">
          @for (sectionId of mainSections(); track sectionId) {
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
                        <div class="cv-entry-title">{{ project.role ? project.name + ' · ' + project.role : project.name }}</div>
                        @if (project.url) { <div class="cv-entry-meta">{{ project.url }}</div> }
                        @if (project.description) { <p>{{ project.description }}</p> }
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
            }
          }
        </main>
      </div>
    </div>
  `,
})
export class ExecutiveTemplateComponent {
  readonly document = input.required<CvDocument>();
  readonly lang = computed(() => this.document().settings.cvLanguage);
  readonly fontStack = computed(() => FONT_STACKS[this.document().settings.fontFamily] ?? FONT_STACKS['system']);

  private readonly hiddenFilter = (id: string) => !this.document().settings.hiddenSections.includes(id);
  readonly sidebarSections = computed(() => SIDEBAR_SECTIONS.filter(this.hiddenFilter));
  readonly mainSections = computed(() => MAIN_SECTIONS.filter(this.hiddenFilter));

  label(sectionId: string): string {
    return LABELS[sectionId]?.[this.lang()] ?? sectionId;
  }

  formatDate(value: string | null | undefined): string {
    return formatMonth(value, this.lang());
  }
}
