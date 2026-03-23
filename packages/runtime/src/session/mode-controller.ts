import type { TaskMode } from "../../../shared/src/task";

export interface RuntimeModeFlow {
  mode: TaskMode;
  label: string;
  objective: string;
  checklist: string[];
}

const runtimeModeFlows: Record<TaskMode, RuntimeModeFlow> = {
  plan: {
    mode: "plan",
    label: "Plan",
    objective: "Turn the task into an executable plan before touching more code.",
    checklist: [
      "Clarify the goal and constraints from the saved task state.",
      "Produce a short, inspectable plan that can survive interruption.",
      "Capture the next step so build mode can resume without transcript replay."
    ]
  },
  build: {
    mode: "build",
    label: "Build",
    objective: "Execute the current plan with the saved task brief and scoped memory.",
    checklist: [
      "Start from the latest plan snapshot and resume hints.",
      "Work against the linked files instead of rehydrating full chat history.",
      "Keep task state fresh enough that review can inspect what changed."
    ]
  },
  review: {
    mode: "review",
    label: "Review",
    objective: "Inspect the result against the stored plan, files, and completion state.",
    checklist: [
      "Compare the outcome against the saved task goal and plan.",
      "Look for correctness gaps, missing verification, and stale assumptions.",
      "Summarize blocking issues before anything is called done."
    ]
  }
};

export class ModeController {
  get(mode: TaskMode): RuntimeModeFlow {
    return runtimeModeFlows[mode];
  }
}
