import { JobOfferDto, OfferStep, newStep } from '../models/job-offer';
import { buildIcs, formatScore, nextStep, upcomingSteps } from './offer-utils';

function step(over: Partial<OfferStep>): OfferStep {
  return { ...newStep('hrCall'), ...over };
}
function offer(id: string, status: 'applied' | 'rejected', steps: OfferStep[]): JobOfferDto {
  return {
    id, createdAt: '', updatedAt: '', cvs: [],
    document: {
      title: 'T' + id, company: 'C' + id, location: '', contractType: '', url: '', description: '',
      technologies: [], missions: [], requirements: [], status, notes: '', steps,
    },
  };
}
const now = new Date('2026-11-12T12:00');

describe('offer-utils', () => {
  it('upcomingSteps sorts across offers, skips past/dateless/non-upcoming steps and rejected offers, respects limit', () => {
    const offers = [
      offer('1', 'applied', [
        step({ id: 'a', date: '2026-11-20T09:00' }),
        step({ id: 'past', date: '2026-11-01T09:00' }),
        step({ id: 'nodate' }),
        step({ id: 'done', date: '2026-11-21T09:00', result: 'passed' }),
      ]),
      offer('2', 'applied', [
        step({ id: 'b', date: '2026-11-15T09:00' }),
        step({ id: 'c', date: '2026-11-25T09:00' }),
        step({ id: 'd', date: '2026-11-30T09:00' }),
      ]),
      offer('3', 'rejected', [step({ id: 'rej', date: '2026-11-13T09:00' })]),
    ];
    const res = upcomingSteps(offers, now);
    expect(res.map((r) => r.step.id)).toEqual(['b', 'a', 'c']);
    expect(res[0]).toMatchObject({ offerId: '2', title: 'T2', company: 'C2' });
    expect(upcomingSteps(offers, now, 10).map((r) => r.step.id)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('nextStep returns null when no dated upcoming step', () => {
    expect(nextStep(offer('1', 'applied', [step({}), step({ date: '2026-01-01T00:00' })]).document, now)).toBeNull();
    const o = offer('1', 'applied', [step({ id: 'x', date: '2026-12-01T00:00' }), step({ id: 'y', date: '2026-11-14T00:00' })]);
    expect(nextStep(o.document, now)?.id).toBe('y');
  });

  it('buildIcs produces floating DTSTART 20261118T100000 and DTEND 20261118T110000 for "2026-11-18T10:00"', () => {
    const o = offer('1', 'applied', []).document;
    const ics = buildIcs(step({ id: 's1', date: '2026-11-18T10:00', place: 'Paris', noteBefore: 'Prep' }), o, 'Entretien RH');
    expect(ics).toContain('DTSTART:20261118T100000\r\n');
    expect(ics).toContain('DTEND:20261118T110000\r\n');
    expect(ics).toContain('UID:s1@cvforge');
    expect(ics).toContain('PRODID:-//CvForge//FR');
    expect(ics).toContain('SUMMARY:Entretien RH – C1');
    expect(ics).toContain('LOCATION:Paris');
    expect(ics).toContain('DESCRIPTION:Prep');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('buildIcs escapes "a, b; c\nd" as "a\, b\; c\nd" and uses \r\n', () => {
    const o = offer('1', 'applied', []).document;
    const ics = buildIcs(step({ date: '2026-11-18T10:00', noteBefore: 'a, b; c\nd' }), o, 'X');
    expect(ics).toContain(String.raw`DESCRIPTION:a\, b\; c\nd`);
    expect(ics.split('\r\n').length).toBeGreaterThan(5);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('formatScore', () => {
    expect(formatScore(null)).toBe('');
    expect(formatScore(75)).toBe('75%');
  });
});
