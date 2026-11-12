import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../core/api-config';
import { JobOfferDto } from '../models/job-offer';
import { OfferStore } from './offer-store';

function makeDto(score: number | null = 50): JobOfferDto {
  return {
    id: 'offer-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      title: 'Dev', company: 'Acme', location: '', contractType: 'CDI', url: '', description: '',
      technologies: ['C#'], missions: [], requirements: [], status: 'toApply', notes: '', steps: [],
    },
    cvs: [{ id: 'cv-1', name: 'CV Acme', language: 'fr', score }],
  };
}

describe('OfferStore', () => {
  let store: OfferStore;
  let httpMock: HttpTestingController;
  const url = `${API_BASE_URL}/api/offers/offer-1`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(OfferStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
  });

  async function loaded() {
    const p = store.load('offer-1');
    httpMock.expectOne(url).flush(makeDto());
    await p;
  }

  it('load() populates document and cvs', async () => {
    await loaded();
    expect(store.offerId()).toBe('offer-1');
    expect(store.document()?.title).toBe('Dev');
    expect(store.cvs()).toHaveLength(1);
    expect(store.saveState()).toBe('idle');
  });

  it('update() debounces a single PUT to /api/offers/{id} after 1500 ms', async () => {
    await loaded();
    vi.useFakeTimers();
    store.update((d) => ({ ...d, title: 'A' }));
    store.update((d) => ({ ...d, title: 'B' }));
    vi.advanceTimersByTime(1499);
    httpMock.expectNone(url);
    vi.advanceTimersByTime(1);
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.title).toBe('B');
    expect(store.saveState()).toBe('saving');
    req.flush(makeDto());
    await vi.advanceTimersByTimeAsync(0);
    expect(store.saveState()).toBe('saved');
  });

  it('saved response refreshes cvs scores', async () => {
    await loaded();
    store.update((d) => ({ ...d, technologies: ['C#', 'Angular'] }));
    const p = store.saveNow();
    httpMock.expectOne(url).flush(makeDto(80));
    await p;
    expect(store.cvs()[0].score).toBe(80);
  });
});
