import { Component, computed, input } from '@angular/core';
import { CvDocument } from '../../models/cv-document';
import { formatMonth } from '../format-month';
import { joinFields } from '../join-fields';

const LABELS: Record<string, { fr: string; en: string }> = {
  summary: { fr: '// profil', en: '// profile' },
  experiences: { fr: '// experience', en: '// experience' },
  projects: { fr: '// projets', en: '// projects' },
  education: { fr: '// formation', en: '// education' },
  skills: { fr: '// stack', en: '// stack' },
  languages: { fr: '// langues', en: '// languages' },
  certifications: { fr: '// certifications', en: '// certifications' },
  interests: { fr: '// intérêts', en: '// interests' },
};

@Component({
  selector: 'app-tech-template',
  template: `
    @let doc = document();
    <div
      class="cv-page"
      style="padding: 0;"
      [style.--cv-primary]="doc.settings.primaryColor"
      [style.--cv-secondary]="doc.settings.secondaryColor"
      [style.--cv-font]="'\\'JetBrains Mono\\', ui-monospace, monospace'"
      [style.--cv-scale]="doc.settings.fontScale"
    >
      <header style="background: #0f172a; color: #e2e8f0; padding: 12mm 12mm 8mm; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div>
          <h1 style="color: #e2e8f0;">{{ doc.personalInfo.firstName }} {{ doc.personalInfo.lastName }}</h1>
          <h2 style="color: var(--cv-primary);">{{ doc.personalInfo.jobTitle }}</h2>
          <p style="color: #94a3b8; font-size: 9pt;">{{ contactLine(doc.personalInfo) }}</p>
        </div>
        @if (doc.personalInfo.photoUrl) { <img class="cv-photo" [src]="doc.personalInfo.photoUrl" alt="" /> }
      </header>

      <div style="padding: 8mm 12mm;">
        @for (sectionId of visibleSections(); track sectionId) {
          @switch (sectionId) {
            @case ('summary') {
              @if (doc.summary) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('summary') }}</div>
                  <p>{{ doc.summary }}</p>
                </section>
              }
            }
            @case ('skills') {
              @if (doc.skillCategories.length) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('skills') }}</div>
                  @for (cat of doc.skillCategories; track $index) {
                    <div class="cv-entry">
                      <div class="cv-entry-title">{{ cat.name }}</div>
                      @for (skill of cat.skills; track skill) { <span class="cv-tag">{{ skill }}</span> }
                    </div>
                  }
                </section>
              }
            }
            @case ('experiences') {
              @if (doc.experiences.length) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('experiences') }}</div>
                  @for (exp of doc.experiences; track $index) {
                    <div class="cv-entry">
                      <div class="cv-entry-title">{{ joinFields(' @ ', exp.position, exp.company) }}</div>
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
                      @for (tech of exp.technologies; track tech) { <span class="cv-tag">{{ tech }}</span> }
                    </div>
                  }
                </section>
              }
            }
            @case ('projects') {
              @if (doc.projects.length) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('projects') }}</div>
                  @for (project of doc.projects; track $index) {
                    <div class="cv-entry">
                      <div class="cv-entry-title">{{ project.role ? project.name + ' · ' + project.role : project.name }}</div>
                      @if (project.date || project.url) { <div class="cv-entry-meta">{{ joinFields(' · ', formatDate(project.date), project.url) }}</div> }
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
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('education') }}</div>
                  @for (edu of doc.education; track $index) {
                    <div class="cv-entry">
                      <div class="cv-entry-title">{{ joinFields(' · ', edu.degree, edu.school) }}</div>
                      <div class="cv-entry-meta">{{ edu.graduationYear }}</div>
                    </div>
                  }
                </section>
              }
            }
            @case ('languages') {
              @if (doc.languages.length) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('languages') }}</div>
                  @for (l of doc.languages; track $index) { <span class="cv-tag">{{ joinFields(' ', l.name, l.level) }}</span> }
                </section>
              }
            }
            @case ('certifications') {
              @if (doc.certifications.length) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('certifications') }}</div>
                  @for (cert of doc.certifications; track $index) { <p>{{ joinFields(' — ', cert.name, cert.issuer) }}</p> }
                </section>
              }
            }
            @case ('interests') {
              @if (doc.interests.length) {
                <section class="cv-section">
                  <div class="cv-section-title" style="border-bottom: none;">{{ label('interests') }}</div>
                  @for (interest of doc.interests; track interest) { <span class="cv-tag">{{ interest }}</span> }
                </section>
              }
            }
          }
        }
      </div>
    </div>
  `,
})
export class TechTemplateComponent {
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

  protected readonly joinFields = joinFields;

  contactLine(info: CvDocument['personalInfo']): string {
    return joinFields(' · ', info.email, info.phone, info.city, info.linkedIn, info.gitHub);
  }
}
