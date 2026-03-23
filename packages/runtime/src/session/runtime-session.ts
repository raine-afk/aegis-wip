import type { TaskMode, TaskResumeSelection, TaskRecord, RuntimeSessionOrigin } from "../../../shared/src/task";
import type { CreateTaskInput } from "../tasks/task-events";
import { TaskService } from "../tasks/task-service";
import { ContextBuilder, type RuntimeMemoryRetriever, type RuntimeSessionContext } from "./context-builder";
import { ModeController, type RuntimeModeFlow } from "./mode-controller";

export interface StartRuntimeSessionInput extends CreateTaskInput {}

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
    const task = this.options.taskService.createTask(input);
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

    const nextMode = input.mode ?? resumableState.task.mode;
    const task = this.options.taskService.updateTask(resumableState.task.id, {
      mode: nextMode,
      status: "in-progress",
      updatedAt: input.updatedAt
    });

    return this.createSession({
      origin: "resumed",
      selection: resumableState.selection,
      task
    });
  }

  private async createSession(input: {
    origin: RuntimeSessionOrigin;
    task: TaskRecord;
    selection?: TaskResumeSelection;
  }): Promise<RuntimeTaskSession> {
    return {
      origin: input.origin,
      selection: input.selection,
      task: input.task,
      flow: this.modeController.get(input.task.mode),
      context: await this.contextBuilder.build({ task: input.task })
    };
  }
}
