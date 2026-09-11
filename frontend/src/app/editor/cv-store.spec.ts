import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../core/api-config';
import { CvDto } from '../models/cv-document';
import { CvStore } from './cv-store';

function makeCvDto(): CvDto {
  return {
    id: 'cv-1',
    name: 'Nouveau CV',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      templateKey: 'modern',
      settings: {
        primaryColor: '#0F172A',
        secondaryColor: '#64748B',
        fontFamily: 'inter',
        fontScale: 1,
        spacing: 'normal',
        cvLanguage: 'fr',
        sectionOrder: ['summary'],
        hiddenSections: [],
      },
      personalInfo: {
        firstName: '',
        lastName: '',
        jobTitle: '',
        email: '',
        phone: '',
        city: '',
        country: '',
        linkedIn: '',
        gitHub: '',
        portfolio: '',
        website: '',
      },
      summary: '',
      experiences: [],
      projects: [],
      education: [],
      skillCategories: [],
      languages: [],
      certifications: [],
      interests: [],
    },
  };
}

describe('CvStore', () => {
  let store: CvStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CvStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('load() populates document, name and cvId from the API', async () => {
    const loadPromise = store.load('cv-1');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`);
    expect(req.request.method).toBe('GET');
    req.flush(makeCvDto());
    await loadPromise;

    expect(store.cvId()).toBe('cv-1');
    expect(store.name()).toBe('Nouveau CV');
    expect(store.document()?.templateKey).toBe('modern');
    expect(store.saveState()).toBe('idle');
  });

  it('update() mutates the document immutably without touching the previous object', async () => {
    const loadPromise = store.load('cv-1');
    httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`).flush(makeCvDto());
    await loadPromise;

    const before = store.document();
    store.update((doc) => ({ ...doc, summary: 'Updated summary' }));

    expect(store.document()).not.toBe(before);
    expect(store.document()?.summary).toBe('Updated summary');
    expect(before?.summary).toBe('');

    // update() also schedules a debounced autosave (1.5s) — drain it via saveNow() instead of
    // waiting out the real timer; must flush before awaiting, saveNow() only resolves once the
    // mocked PUT responds.
    const savePromise = store.saveNow();
    httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`).flush({});
    await savePromise;
  });

  it('saveNow() flushes a pending autosave immediately without waiting for the debounce', async () => {
    const loadPromise = store.load('cv-1');
    httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`).flush(makeCvDto());
    await loadPromise;

    store.update((doc) => ({ ...doc, summary: 'Urgent change' }));
    const savePromise = store.saveNow();

    const putReq = httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.summary).toBe('Urgent change');
    putReq.flush({});
    await savePromise;

    expect(store.saveState()).toBe('saved');
  });

  it('save failure sets saveState to "error"', async () => {
    const loadPromise = store.load('cv-1');
    httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`).flush(makeCvDto());
    await loadPromise;

    store.update((doc) => ({ ...doc, summary: 'Will fail' }));
    const savePromise = store.saveNow();

    httpMock.expectOne(`${API_BASE_URL}/api/cvs/cv-1`).flush('error', { status: 500, statusText: 'Server Error' });
    await savePromise;

    expect(store.saveState()).toBe('error');
  });

  it('update() before any load() is a no-op (no document to mutate)', () => {
    expect(() => store.update((doc) => ({ ...doc, summary: 'x' }))).not.toThrow();
    expect(store.document()).toBeNull();
  });
});
