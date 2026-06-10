export type ActionFeedbackVariant =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "confirm";

export interface ActionFeedbackOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface ActionFeedbackRequest {
  id: string;
  variant: ActionFeedbackVariant;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  resolve: (value: boolean) => void;
}

export const VARIANT_DEFAULTS: Record<
  ActionFeedbackVariant,
  { title: string; confirmLabel: string }
> = {
  success: { title: "Success", confirmLabel: "OK" },
  error: { title: "Error", confirmLabel: "OK" },
  warning: { title: "Warning", confirmLabel: "OK" },
  info: { title: "Information", confirmLabel: "OK" },
  confirm: { title: "Confirm Action", confirmLabel: "Confirm" },
};
