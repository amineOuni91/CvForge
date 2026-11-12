export type OfferStatus = 'toApply' | 'applied' | 'interview' | 'rejected';
export type StepType =
  | 'cvSent' | 'hrCall' | 'hrInterview' | 'techInterview'
  | 'techTest' | 'directorInterview' | 'offerReceived' | 'other';
export type StepFormat = 'phone' | 'video' | 'onSite';
export type StepResult = 'upcoming' | 'passed' | 'failed' | 'cancelled';

export interface OfferStep {
  id: string;
  type: StepType;
  label: string;
  /** Local wall-clock "yyyy-MM-ddTHH:mm", no offset. */
  date: string | null;
  format: StepFormat;
  contact: string;
  place: string;
  noteBefore: string;
  noteAfter: string;
  result: StepResult;
}

export interface OfferDocument {
  title: string;
  company: string;
  location: string;
  contractType: string;
  url: string;
  description: string;
  technologies: string[];
  missions: string[];
  requirements: string[];
  status: OfferStatus;
  notes: string;
  steps: OfferStep[];
}

export interface LinkedCv {
  id: string;
  name: string;
  language: string;
  score: number | null;
}

export interface JobOfferDto {
  id: string;
  document: OfferDocument;
  createdAt: string;
  updatedAt: string;
  cvs: LinkedCv[];
}

export interface OfferMatch {
  score: number | null;
  found: string[];
  missing: string[];
}

export function newStep(type: StepType): OfferStep {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    date: null,
    format: 'video',
    contact: '',
    place: '',
    noteBefore: '',
    noteAfter: '',
    result: 'upcoming',
  };
}
