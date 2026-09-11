import { TestBed } from '@angular/core/testing';
import { CvDocument } from '../../models/cv-document';
import { ModernTemplateComponent } from './modern-template.component';

function makeDocument(overrides: Partial<CvDocument> = {}): CvDocument {
  return {
    templateKey: 'modern',
    settings: {
      primaryColor: '#0F172A',
      secondaryColor: '#64748B',
      fontFamily: 'inter',
      fontScale: 1,
      spacing: 'normal',
      cvLanguage: 'fr',
      sectionOrder: ['summary', 'experiences', 'skills'],
      hiddenSections: [],
    },
    personalInfo: {
      firstName: 'Amine',
      lastName: 'Ouni',
      jobTitle: 'Software Engineer',
      email: 'amine@example.com',
      phone: '',
      city: '',
      country: '',
      linkedIn: '',
      gitHub: '',
      portfolio: '',
      website: '',
    },
    summary: 'A professional summary.',
    experiences: [],
    projects: [],
    education: [],
    skillCategories: [],
    languages: [],
    certifications: [],
    interests: [],
    ...overrides,
  };
}

describe('ModernTemplateComponent', () => {
  it('renders the personal info header', () => {
    const fixture = TestBed.createComponent(ModernTemplateComponent);
    fixture.componentRef.setInput('document', makeDocument());
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Amine Ouni');
    expect(text).toContain('Software Engineer');
  });

  it('excludes personalInfo from the iterable sections even if present in sectionOrder', () => {
    const fixture = TestBed.createComponent(ModernTemplateComponent);
    fixture.componentRef.setInput(
      'document',
      makeDocument({ settings: { ...makeDocument().settings, sectionOrder: ['personalInfo', 'summary'] } }),
    );

    expect(fixture.componentInstance.visibleSections()).not.toContain('personalInfo');
    expect(fixture.componentInstance.visibleSections()).toContain('summary');
  });

  it('hides a section listed in hiddenSections', () => {
    const fixture = TestBed.createComponent(ModernTemplateComponent);
    fixture.componentRef.setInput(
      'document',
      makeDocument({ settings: { ...makeDocument().settings, hiddenSections: ['summary'] } }),
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('A professional summary.');
  });

  it('shows a section when it is not hidden', () => {
    const fixture = TestBed.createComponent(ModernTemplateComponent);
    fixture.componentRef.setInput('document', makeDocument());
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('A professional summary.');
  });
});
