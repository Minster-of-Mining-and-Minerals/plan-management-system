"use client";

import { Input } from "@/components/ui/input";
import {
  SuggestionTextarea,
  type SuggestionTextareaProps,
} from "./SuggestionTextarea";

/** Single-line clinical text with suggestions (uses textarea engine internally). */
export function SuggestionInput({
  className,
  ...props
}: SuggestionTextareaProps) {
  return (
    <SuggestionTextarea
      rows={1}
      className={className ?? "h-12 min-h-12 resize-none"}
      {...props}
    />
  );
}

export { Input };
