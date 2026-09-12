import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { CvStore } from './cv-store';
import { PersonalInfoSection } from './sections/personal-info.section';
import { SummarySection } from './sections/summary.section';
import { ExperiencesSection } from './sections/experiences.section';
import { ProjectsSection } from './sections/projects.section';
import { EducationSection } from './sections/education.section';
import { SkillsSection } from './sections/skills.section';
import { LanguagesSection } from './sections/languages.section';
import { CertificationsSection } from './sections/certifications.section';
import { InterestsSection } from './sections/interests.section';

const TITLES: Record<string, string> = {
  summary: 'Profil professionnel',
  experiences: 'Expériences',
  projects: 'Projets',
  education: 'Formation',
  skills: 'Compétences',
  languages: 'Langues',
  certifications: 'Certifications',
  interests: "Centres d'intérêt",
};

@Component({
  selector: 'app-section-list',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    PersonalInfoSection,
    SummarySection,
    ExperiencesSection,
    ProjectsSection,
    EducationSection,
    SkillsSection,
    LanguagesSection,
    CertificationsSection,
    InterestsSection,
  ],
  template: `
    <div class="divide-y divide-slate-200 dark:divide-slate-700">
      <div>
        <button type="button" (click)="toggle('personalInfo')"
                class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100">
          Informations personnelles
          <span class="text-slate-400">{{ isOpen('personalInfo') ? '▾' : '▸' }}</span>
        </button>
        @if (isOpen('personalInfo')) {
          <div class="px-4 pb-4"><app-personal-info-section /></div>
        }
      </div>

      <div cdkDropList (cdkDropListDropped)="onDrop($event)">
        @for (sectionId of sectionOrder(); track sectionId) {
          <div cdkDrag>
            <div class="flex items-center px-4 py-3">
              <span cdkDragHandle class="mr-2 cursor-move text-slate-400" title="Réordonner">⠿</span>
              <button type="button" (click)="toggle(sectionId)" class="flex flex-1 items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-100">
                {{ TITLES[sectionId] }}
                <span class="ml-2 text-slate-400">{{ isOpen(sectionId) ? '▾' : '▸' }}</span>
              </button>
              <button type="button" (click)="toggleHidden(sectionId)" class="ml-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      [title]="isHidden(sectionId) ? 'Section masquée du CV — afficher' : 'Masquer cette section du CV'">
                {{ isHidden(sectionId) ? '🚫' : '👁' }}
              </button>
            </div>
            @if (isOpen(sectionId)) {
              <div class="px-4 pb-4">
                @switch (sectionId) {
                  @case ('summary') { <app-summary-section /> }
                  @case ('experiences') { <app-experiences-section /> }
                  @case ('projects') { <app-projects-section /> }
                  @case ('education') { <app-education-section /> }
                  @case ('skills') { <app-skills-section /> }
                  @case ('languages') { <app-languages-section /> }
                  @case ('certifications') { <app-certifications-section /> }
                  @case ('interests') { <app-interests-section /> }
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class SectionList {
  private readonly store = inject(CvStore);
  protected readonly TITLES = TITLES;

  private readonly openId = signal<string | null>('personalInfo');
  readonly sectionOrder = computed(() => this.store.document()?.settings.sectionOrder ?? []);

  isOpen(id: string): boolean {
    return this.openId() === id;
  }

  toggle(id: string): void {
    this.openId.set(this.openId() === id ? null : id);
  }

  isHidden(id: string): boolean {
    return this.store.document()?.settings.hiddenSections.includes(id) ?? false;
  }

  toggleHidden(id: string): void {
    this.store.update((doc) => {
      const hidden = doc.settings.hiddenSections.includes(id)
        ? doc.settings.hiddenSections.filter((h) => h !== id)
        : [...doc.settings.hiddenSections, id];
      return { ...doc, settings: { ...doc.settings, hiddenSections: hidden } };
    });
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    this.store.update((doc) => {
      const order = [...doc.settings.sectionOrder];
      moveItemInArray(order, event.previousIndex, event.currentIndex);
      return { ...doc, settings: { ...doc.settings, sectionOrder: order } };
    });
  }
}
