import type { ActionFeedbackOptions } from "./types";

type ActionFeedbackController = {
  confirm: (message: string, options?: ActionFeedbackOptions) => Promise<boolean>;
  success: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
  error: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
  warning: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
  info: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
};

let controller: ActionFeedbackController | null = null;

export function registerActionFeedbackController(
  next: ActionFeedbackController | null
) {
  controller = next;
}

function ensureController() {
  if (!controller) {
    console.warn("ActionFeedbackProvider is not mounted.");
    return false;
  }
  return true;
}

export const actionFeedback = {
  confirm(message: string, options?: ActionFeedbackOptions) {
    if (!ensureController()) return Promise.resolve(false);
    return controller!.confirm(message, options);
  },
  success(message: string, options?: ActionFeedbackOptions) {
    if (!ensureController()) return Promise.resolve();
    return controller!.success(message, options);
  },
  error(message: string, options?: ActionFeedbackOptions) {
    if (!ensureController()) return Promise.resolve();
    return controller!.error(message, options);
  },
  warning(message: string, options?: ActionFeedbackOptions) {
    if (!ensureController()) return Promise.resolve();
    return controller!.warning(message, options);
  },
  info(message: string, options?: ActionFeedbackOptions) {
    if (!ensureController()) return Promise.resolve();
    return controller!.info(message, options);
  },
};
