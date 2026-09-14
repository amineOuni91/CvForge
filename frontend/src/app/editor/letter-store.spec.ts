import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../core/api-config';
import { LetterDto } from '../models/letter-document';
import { LetterStore } from './letter-store';

function makeLetterDto(): LetterDto {
  return {
    id: 'letter-1',
    name: 'Nouvelle lettre',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      templateKey: 'classique',
      settings: { primaryColor: '#0F172A', secondaryColor: '#64748B', fontFamily: 'inter', fontScale: 1, language: 'fr' },
      sender: {
        firstName: '', lastName: '', jobTitle: '', email: '', phone: '', city: '', country: '',
        linkedIn: '', gitHub: '', portfolio: '', website: '',
      },
      recipient: { recruiterName: '', companyName: '', companyAddress: '' },
      jobTitle: '', city: '', date: '', subject: '',
      introduction: '', motivation: '', skills: '', conclusion: '',
    },
  };
}

describe('LetterStore', () => {
  let store: LetterStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(LetterStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('load() populates document, name and letterId from the API', async () => {
    const loadPromise = store.load('letter-1');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`);
    expect(req.request.method).toBe('GET');
    req.flush(makeLetterDto());
    await loadPromise;

    expect(store.letterId()).toBe('letter-1');
    expect(store.name()).toBe('Nouvelle lettre');
    expect(store.document()?.templateKey).toBe('classique');
    expect(store.saveState()).toBe('idle');
  });

  it('load() with an adminUserId targets the admin letter endpoint for every subsequent call', async () => {
    const loadPromise = store.load('letter-1', 'user-42');
    const req = httpMock.expectOne(`${API_BASE_URL}/api/admin/users/user-42/letters/letter-1`);
    req.flush(makeLetterDto());
    await loadPromise;

    store.update((doc) => ({ ...doc, subject: 'Admin edit' }));
    const savePromise = store.saveNow();
    const putReq = httpMock.expectOne(`${API_BASE_URL}/api/admin/users/user-42/letters/letter-1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({});
    await savePromise;
  });

  it('update() mutates the document immutably without touching the previous object', async () => {
    const loadPromise = store.load('letter-1');
    httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`).flush(makeLetterDto());
    await loadPromise;

    const before = store.document();
    store.update((doc) => ({ ...doc, subject: 'Updated subject' }));

    expect(store.document()).not.toBe(before);
    expect(store.document()?.subject).toBe('Updated subject');

    const savePromise = store.saveNow();
    httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`).flush({});
    await savePromise;
  });

  it('saveNow() flushes a pending autosave immediately without waiting for the debounce', async () => {
    const loadPromise = store.load('letter-1');
    httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`).flush(makeLetterDto());
    await loadPromise;

    store.update((doc) => ({ ...doc, subject: 'Urgent change' }));
    const savePromise = store.saveNow();

    const putReq = httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`);
    expect(putReq.request.body.subject).toBe('Urgent change');
    putReq.flush({});
    await savePromise;

    expect(store.saveState()).toBe('saved');
  });

  it('save failure sets saveState to "error"', async () => {
    const loadPromise = store.load('letter-1');
    httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`).flush(makeLetterDto());
    await loadPromise;

    store.update((doc) => ({ ...doc, subject: 'Will fail' }));
    const savePromise = store.saveNow();

    httpMock.expectOne(`${API_BASE_URL}/api/letters/letter-1`).flush('error', { status: 500, statusText: 'Server Error' });
    await savePromise;

    expect(store.saveState()).toBe('error');
  });

  it('update() before any load() is a no-op (no document to mutate)', () => {
    expect(() => store.update((doc) => ({ ...doc, subject: 'x' }))).not.toThrow();
    expect(store.document()).toBeNull();
  });
});
