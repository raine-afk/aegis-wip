export const reviewerCheckpoints = ["after-plan", "pre-commit", "final-completion"] as const;
export type ReviewerCheckpoint = (typeof reviewerCheckpoints)[number];

export const reviewerVerdicts = ["approved", "needs-changes", "blocked"] as const;
export type ReviewerVerdict = (typeof reviewerVerdicts)[number];

export interface ReviewerFinding {
  code: string;
  message: string;
  relatedFiles?: string[];
}

export interface ReviewerMemoryWarning {
  memoryId: string;
  message: string;
}

export interface ReviewerOutput {
  checkpoint: ReviewerCheckpoint;
  verdict: ReviewerVerdict;
  blockingIssues: ReviewerFinding[];
  nonBlockingConcerns: ReviewerFinding[];
  needsVerification: boolean;
  memoryWarnings: ReviewerMemoryWarning[];
  recommendedNextStep?: string;
}
