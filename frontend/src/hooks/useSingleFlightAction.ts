"use client";

import { useCallback, useRef } from "react";

/**
 * Wraps an async handler so only one invocation runs at a time.
 * Prevents duplicate API calls from double-clicks before mutation loading state updates.
 */
export function useSingleFlightAction() {
  const inFlightRef = useRef(false);

  return useCallback(async (action: () => Promise<void>) => {
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    try {
      await action();
    } finally {
      inFlightRef.current = false;
    }
  }, []);
}

export function handleDialogOpenChange(open: boolean, onClose: () => void) {
  if (!open) {
    onClose();
  }
}
