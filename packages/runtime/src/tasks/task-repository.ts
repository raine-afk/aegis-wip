import type { Database } from "bun:sqlite";
import type { LinkedIssueOrPr, PlanSnapshot, TaskCompletionSummary, TaskRecord, TaskResumeHints } from "../../../shared/src/task";

interface TaskRow {
  id: string;
  title: string;
  goal: string;
  mode: TaskRecord["mode"];
  status: TaskRecord["status"];
  linked_issue_or_pr_json: string | null;
  plan_snapshot_json: string | null;
  completion_summary_json: string | null;
  resume_hints_json: string | null;
  linked_memory_ids_json: string;
  related_files_json: string;
  created_at: string;
  updated_at: string;
}

function serializeJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function parseOptionalJson<T>(value: string | null): T | undefined {
  if (value === null) {
    return undefined;
  }

  return JSON.parse(value) as T;
}

function parseRequiredJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export class TaskRepository {
  constructor(private readonly database: Database) {}

  save(task: TaskRecord): TaskRecord {
    this.database
      .query(
        `
          INSERT INTO tasks (
            id,
            title,
            goal,
            mode,
            status,
            linked_issue_or_pr_json,
            plan_snapshot_json,
            completion_summary_json,
            resume_hints_json,
            linked_memory_ids_json,
            related_files_json,
            created_at,
            updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            goal = excluded.goal,
            mode = excluded.mode,
            status = excluded.status,
            linked_issue_or_pr_json = excluded.linked_issue_or_pr_json,
            plan_snapshot_json = excluded.plan_snapshot_json,
            completion_summary_json = excluded.completion_summary_json,
            resume_hints_json = excluded.resume_hints_json,
            linked_memory_ids_json = excluded.linked_memory_ids_json,
            related_files_json = excluded.related_files_json,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `
      )
      .run(
        task.id,
        task.title,
        task.goal,
        task.mode,
        task.status,
        serializeJson(task.linkedIssueOrPr),
        serializeJson(task.planSnapshot),
        serializeJson(task.completionSummary),
        serializeJson(task.resumeHints),
        JSON.stringify(task.linkedMemoryIds),
        JSON.stringify(task.relatedFiles),
        task.createdAt,
        task.updatedAt
      );

    return task;
  }

  getById(taskId: string): TaskRecord | null {
    const row = this.database
      .query(`
        SELECT
          id,
          title,
          goal,
          mode,
          status,
          linked_issue_or_pr_json,
          plan_snapshot_json,
          completion_summary_json,
          resume_hints_json,
          linked_memory_ids_json,
          related_files_json,
          created_at,
          updated_at
        FROM tasks
        WHERE id = ?1
      `)
      .get(taskId) as TaskRow | null;

    return row ? this.mapRow(row) : null;
  }

  getLatestResumable(): TaskRecord | null {
    const row = this.database
      .query(`
        SELECT
          id,
          title,
          goal,
          mode,
          status,
          linked_issue_or_pr_json,
          plan_snapshot_json,
          completion_summary_json,
          resume_hints_json,
          linked_memory_ids_json,
          related_files_json,
          created_at,
          updated_at
        FROM tasks
        WHERE status IN ('pending', 'in-progress', 'blocked', 'interrupted')
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
      `)
      .get() as TaskRow | null;

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: TaskRow): TaskRecord {
    return {
      id: row.id,
      title: row.title,
      goal: row.goal,
      mode: row.mode,
      status: row.status,
      linkedIssueOrPr: parseOptionalJson<LinkedIssueOrPr>(row.linked_issue_or_pr_json),
      linkedMemoryIds: parseRequiredJson<string[]>(row.linked_memory_ids_json),
      relatedFiles: parseRequiredJson<string[]>(row.related_files_json),
      planSnapshot: parseOptionalJson<PlanSnapshot>(row.plan_snapshot_json),
      completionSummary: parseOptionalJson<TaskCompletionSummary>(row.completion_summary_json),
      resumeHints: parseOptionalJson<TaskResumeHints>(row.resume_hints_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
