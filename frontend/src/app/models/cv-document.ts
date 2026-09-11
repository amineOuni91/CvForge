export interface CvSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontScale: number;
  spacing: string;
  cvLanguage: 'fr' | 'en';
  sectionOrder: string[];
  hiddenSections: string[];
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  jobTitle: string;
  photoUrl?: string | null;
  email: string;
  phone: string;
  city: string;
  country: string;
  linkedIn: string;
  gitHub: string;
  portfolio: string;
  website: string;
}

export interface Experience {
  position: string;
  company: string;
  city: string;
  country: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description: string;
  technologies: string[];
  missions: string[];
  achievements: string[];
}

export interface Project {
  name: string;
  description: string;
  role: string;
  technologies: string[];
  url: string;
  date: string;
}

export interface EducationEntry {
  degree: string;
  school: string;
  city: string;
  country: string;
  graduationYear: string;
  description: string;
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface LanguageEntry {
  name: string;
  level: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface CvDocument {
  templateKey: string;
  settings: CvSettings;
  personalInfo: PersonalInfo;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  education: EducationEntry[];
  skillCategories: SkillCategory[];
  languages: LanguageEntry[];
  certifications: Certification[];
  interests: string[];
}

export interface CvDto {
  id: string;
  name: string;
  document: CvDocument;
  createdAt: string;
  updatedAt: string;
}

export interface CvSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'] as const;
