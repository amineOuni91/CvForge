import { JobOfferDto, OfferDocument, OfferStep } from '../models/job-offer';

export interface UpcomingStep {
  offerId: string;
  title: string;
  company: string;
  step: OfferStep;
  at: Date;
}

function isUpcoming(step: OfferStep, now: Date): boolean {
  return step.result === 'upcoming' && !!step.date && new Date(step.date) >= now;
}

export function upcomingSteps(offers: JobOfferDto[], now: Date, limit = 3): UpcomingStep[] {
  return offers
    .filter((o) => o.document.status !== 'rejected')
    .flatMap((o) =>
      o.document.steps
        .filter((s) => isUpcoming(s, now))
        .map((step) => ({ offerId: o.id, title: o.document.title, company: o.document.company, step, at: new Date(step.date!) })),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, limit);
}

export function nextStep(offer: OfferDocument, now: Date): OfferStep | null {
  const dated = offer.steps.filter((s) => isUpcoming(s, now));
  dated.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  return dated[0] ?? null;
}

const pad = (n: number) => String(n).padStart(2, '0');
// Floating local time (no Z): "yyyyMMddTHHmmss"
const floating = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const esc = (s: string) => s.replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');

export function buildIcs(step: OfferStep, offer: OfferDocument, stepLabel: string): string {
  const start = new Date(step.date!);
  const end = new Date(start.getTime() + 3600_000);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CvForge//FR',
    'BEGIN:VEVENT',
    `UID:${step.id}@cvforge`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${floating(start)}`,
    `DTEND:${floating(end)}`,
    `SUMMARY:${esc(`${stepLabel} – ${offer.company}`)}`,
  ];
  if (step.place) lines.push(`LOCATION:${esc(step.place)}`);
  if (step.noteBefore) lines.push(`DESCRIPTION:${esc(step.noteBefore)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function formatScore(score: number | null): string {
  return score === null ? '' : `${score}%`;
}
