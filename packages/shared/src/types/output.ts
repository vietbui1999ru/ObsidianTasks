export interface ResumeOutput {
  company: string;
  jobTitle: string;
  candidateName: string;
  markdownContent: string;
  filename: string;
}

export interface GenerationManifest {
  batchId: string;
  startedAt: number;
  completedAt?: number;
  resumes: Array<{
    filename: string;
    status: "success" | "failed";
    error?: string;
  }>;
}
