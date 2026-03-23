export const permissionModes = ["default", "read-only", "confirm-destructive"] as const;
export type PermissionMode = (typeof permissionModes)[number];

export const permissionActions = [
  "file-read",
  "file-edit",
  "command-run",
  "command-destructive",
  "git-read",
  "git-branch",
  "git-stage",
  "git-commit",
  "external-open"
] as const;
export type PermissionAction = (typeof permissionActions)[number];

export const permissionDecisions = ["allow", "ask", "deny"] as const;
export type PermissionDecision = (typeof permissionDecisions)[number];

export type PermissionRuleSet = Record<PermissionAction, PermissionDecision>;

export interface PermissionPolicy {
  mode: PermissionMode;
  rules: PermissionRuleSet;
}

export interface PermissionRequest {
  action: PermissionAction;
  target?: string;
  reason?: string;
  command?: string;
}

export interface PermissionResult {
  action: PermissionAction;
  decision: PermissionDecision;
  reason?: string;
}
