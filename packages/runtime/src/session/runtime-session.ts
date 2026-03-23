import type { RuntimeSessionOrigin, TaskMode, TaskResumeSelection, TaskRecord } from "../../../shared/src/task";
import type { CreateTaskInput } from "../tasks/task-events";
import { TaskService } from "../tasks/task-service";
import { ContextBuilder, type RuntimeMemoryRetriever, type RuntimeSessionContext } from "./context-builder";
import { ModeController, type RuntimeModeFlow } from "./mode-controller";

const runtimeStartMode: TaskMode = "plan";
const runtimeResumeMode: TaskMode = "build";

function nowIso(): string {
  return new Date().toISOString();
}

export interface StartRuntimeSessionInput extends Omit<CreateTaskInput, "mode" | "status"> {}

export interface ResumeRuntimeSessionInput {
  taskId?: string;
  mode?: TaskMode;
  updatedAt?: string;
}

export interface RuntimeTaskSession {
  origin: RuntimeSessionOrigin;
  selection?: TaskResumeSelection;
  task: TaskRecord;
  flow: RuntimeModeFlow;
  context: RuntimeSessionContext;
}

export interface RuntimeSessionOptions {
  taskService: TaskService;
  memoryRetriever: RuntimeMemoryRetriever;
  modeController?: ModeController;
  contextBuilder?: ContextBuilder;
}

export class RuntimeSession {
  private readonly modeController: ModeController;
  private readonly contextBuilder: ContextBuilder;

  constructor(private readonly options: RuntimeSessionOptions) {
    this.modeController = options.modeController ?? new ModeController();
    this.contextBuilder = options.contextBuilder ?? new ContextBuilder(options.memoryRetriever);
  }

  async start(input: StartRuntimeSessionInput): Promise<RuntimeTaskSession> {
    const task = this.options.taskService.createTask({
      ...input,
      mode: runtimeStartMode,
      status: "in-progress"
    });

    return this.createSession({
      origin: "started",
      task
    });
  }

  async resume(input: ResumeRuntimeSessionInput = {}): Promise<RuntimeTaskSession> {
    const resumableState = this.options.taskService.getResumableTaskState({ taskId: input.taskId });

    if (!resumableState) {
      throw new Error(input.taskId ? `Task ${input.taskId} is not resumable.` : "No resumable task found.");
    }

    const nextMode = input.mode ?? runtimeResumeMode;
    const updatedAt = input.updatedAt ?? nowIso();
    const nextTask: TaskRecord = {
      ...resumableState.task,
      mode: nextMode,
      status: "in-progress",
      updatedAt
    };
    const context = await this.contextBuilder.build({ task: nextTask });
    const task = this.options.taskService.updateTask(resumableState.task.id, {
      mode: nextMode,
      status: "in-progress",
      updatedAt
    });

    return this.createSession({
      origin: "resumed",
      selection: resumableState.selection,
      task,
      context
    });
  }

  private async createSession(input: {
    origin: RuntimeSessionOrigin;
    task: TaskRecord;
    selection?: TaskResumeSelection;
    context?: RuntimeSessionContext;
  }): Promise<RuntimeTaskSession> {
    return {
      origin: input.origin,
      selection: input.selection,
      task: input.task,
      flow: this.modeController.get(input.task.mode),
      context: input.context ?? (await this.contextBuilder.build({ task: input.task }))
    };
  }
}
