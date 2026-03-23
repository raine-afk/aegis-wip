export const gitChangeTypes = [
  "added",
  "modified",
  "deleted",
  "renamed",
  "untracked",
  "conflicted"
] as const;
export type GitChangeType = (typeof gitChangeTypes)[number];

export interface GitBranchState {
  name: string;
  upstreamName?: string | null;
  ahead: number;
  behind: number;
}

export interface GitFileChange {
  path: string;
  staged: GitChangeType | null;
  unstaged: GitChangeType | null;
}

export interface GitState {
  branch: GitBranchState | null;
  files: GitFileChange[];
  clean: boolean;
  lastCommitSha?: string | null;
}
