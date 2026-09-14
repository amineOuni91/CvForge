import { PersonalInfo } from './cv-document';

export interface LetterSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontScale: number;
  language: 'fr' | 'en';
}

export interface RecipientInfo {
  recruiterName: string;
  companyName: string;
  companyAddress: string;
}

export interface LetterDocument {
  templateKey: string;
  settings: LetterSettings;
  sender: PersonalInfo;
  recipient: RecipientInfo;
  jobTitle: string;
  city: string;
  date: string;
  subject: string;
  introduction: string;
  motivation: string;
  skills: string;
  conclusion: string;
}

export interface LetterDto {
  id: string;
  name: string;
  document: LetterDocument;
  createdAt: string;
  updatedAt: string;
}

export interface LetterSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
