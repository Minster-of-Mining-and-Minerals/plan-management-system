export type ExecutionEvaluationStatus =
  | "completed"
  | "in_progress"
  | "not_started"
  | "no_evaluation";

export const EXECUTION_EVALUATION_STATUS_LABELS: Record<ExecutionEvaluationStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
  no_evaluation: "No Evaluation Available",
};

export function formatExecutionEvaluationStatus(
  status?: ExecutionEvaluationStatus | null
): string {
  if (!status) return EXECUTION_EVALUATION_STATUS_LABELS.no_evaluation;
  return EXECUTION_EVALUATION_STATUS_LABELS[status] ?? status;
}

export function treeHasEvaluableNodes(nodes: { is_evaluable?: boolean; children?: unknown[] }[]): boolean {
  for (const node of nodes) {
    if (node.is_evaluable) return true;
    if (Array.isArray(node.children) && treeHasEvaluableNodes(node.children as typeof nodes)) {
      return true;
    }
  }
  return false;
}
