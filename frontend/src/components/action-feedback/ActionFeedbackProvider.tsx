"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActionFeedbackModal } from "./ActionFeedbackModal";
import {
  ActionFeedbackOptions,
  ActionFeedbackRequest,
  ActionFeedbackVariant,
  VARIANT_DEFAULTS,
} from "./types";
import { registerActionFeedbackController } from "./actionFeedback";

interface ActionFeedbackContextValue {
  show: (
    variant: ActionFeedbackVariant,
    message: string,
    options?: ActionFeedbackOptions
  ) => Promise<boolean>;
  confirm: (message: string, options?: ActionFeedbackOptions) => Promise<boolean>;
  success: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
  error: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
  warning: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
  info: (message: string, options?: ActionFeedbackOptions) => Promise<void>;
}

const ActionFeedbackContext = createContext<ActionFeedbackContextValue | null>(
  null
);

function createRequest(
  variant: ActionFeedbackVariant,
  message: string,
  options: ActionFeedbackOptions = {}
): Omit<ActionFeedbackRequest, "resolve"> {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    variant,
    message,
    title: options.title ?? VARIANT_DEFAULTS[variant].title,
    confirmLabel: options.confirmLabel ?? VARIANT_DEFAULTS[variant].confirmLabel,
    cancelLabel: options.cancelLabel,
    destructive: options.destructive,
  };
}

export function ActionFeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queueRef = useRef<ActionFeedbackRequest[]>([]);
  const [active, setActive] = useState<ActionFeedbackRequest | null>(null);
  const activeRef = useRef<ActionFeedbackRequest | null>(null);

  const pumpQueue = useCallback(() => {
    if (activeRef.current) return;
    const next = queueRef.current.shift() ?? null;
    activeRef.current = next;
    setActive(next);
  }, []);

  const enqueue = useCallback(
    (
      variant: ActionFeedbackVariant,
      message: string,
      options?: ActionFeedbackOptions
    ) =>
      new Promise<boolean>((resolve) => {
        queueRef.current.push({
          ...createRequest(variant, message, options),
          resolve,
        });
        pumpQueue();
      }),
    [pumpQueue]
  );

  const closeActive = useCallback((result: boolean) => {
    const current = activeRef.current;
    if (!current) return;
    current.resolve(result);
    activeRef.current = null;
    setActive(null);
    requestAnimationFrame(() => pumpQueue());
  }, [pumpQueue]);

  const show = useCallback(
    (variant: ActionFeedbackVariant, message: string, options?: ActionFeedbackOptions) =>
      enqueue(variant, message, options),
    [enqueue]
  );

  const value: ActionFeedbackContextValue = {
    show,
    confirm: (message, options) =>
      show("confirm", message, { destructive: options?.destructive, ...options }),
    success: async (message, options) => {
      await show("success", message, options);
    },
    error: async (message, options) => {
      await show("error", message, options);
    },
    warning: async (message, options) => {
      await show("warning", message, options);
    },
    info: async (message, options) => {
      await show("info", message, options);
    },
  };

  useEffect(() => {
    registerActionFeedbackController(value);
    return () => registerActionFeedbackController(null);
  }, [value]);

  return (
    <ActionFeedbackContext.Provider value={value}>
      {children}
      <ActionFeedbackModal
        request={active}
        onConfirm={() => closeActive(true)}
        onCancel={() => closeActive(false)}
      />
    </ActionFeedbackContext.Provider>
  );
}

export function useActionFeedback() {
  const ctx = useContext(ActionFeedbackContext);
  if (!ctx) {
    throw new Error("useActionFeedback must be used within ActionFeedbackProvider");
  }
  return ctx;
}
