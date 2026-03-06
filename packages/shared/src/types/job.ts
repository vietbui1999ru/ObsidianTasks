export interface JobDescription {
  raw: string;
  source?: string;
}

export interface ParsedJobDescription {
  company: string;
  title: string;
  seniorityLevel?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
}
