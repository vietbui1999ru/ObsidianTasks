export interface VaultProfile {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary: string;
}

export interface VaultSkill {
  name: string;
  category?: string;
}

export interface VaultProject {
  title: string;
  description: string;
  techStack: string[];
  tags: string[];
  impact?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
}

export interface VaultExperience {
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  bullets: string[];
  techStack?: string[];
  location?: string;
}

export interface VaultEducation {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

export interface VaultData {
  profile: VaultProfile;
  skills: VaultSkill[];
  projects: VaultProject[];
  experiences: VaultExperience[];
  education: VaultEducation[];
  warnings: string[];
}
