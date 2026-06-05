"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useLazySearchClinicalSuggestionsQuery,
  useRecordClinicalSuggestionUsageMutation,
  type ClinicalSuggestion,
  type ClinicalSuggestionCategory,
} from "@/redux/api/clinicalSuggestionApi";

export type SuggestionTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  category?: ClinicalSuggestionCategory;
  enableSuggestions?: boolean;
  showGhostCompletion?: boolean;
  minChars?: number;
};

function getCurrentToken(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  const match = before.match(/(?:^|\s)(\S*)$/);
  return match?.[1] ?? "";
}

function getGhostCompletion(value: string, suggestion: string) {
  const trimmed = value.trimEnd();
  if (!trimmed) return suggestion;
  const lowerValue = trimmed.toLowerCase();
  const lowerSuggestion = suggestion.toLowerCase();
  if (lowerSuggestion.startsWith(lowerValue)) {
    return suggestion.slice(trimmed.length);
  }
  return "";
}

export function SuggestionTextarea({
  value,
  onChange,
  category = "general",
  enableSuggestions = true,
  showGhostCompletion = true,
  minChars = 2,
  className,
  disabled,
  onKeyDown,
  ...props
}: SuggestionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [search, { data: suggestions = [], isFetching }] =
    useLazySearchClinicalSuggestionsQuery();
  const [recordUsage] = useRecordClinicalSuggestionUsageMutation();

  const cursorPos = textareaRef.current?.selectionStart ?? value.length;
  const token = getCurrentToken(value, cursorPos);
  const searchQuery = token.length >= minChars ? token : value.trim().slice(-40);

  useEffect(() => {
    if (!enableSuggestions || disabled) return;
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 220);
    return () => clearTimeout(timer);
  }, [searchQuery, enableSuggestions, disabled]);

  useEffect(() => {
    if (!enableSuggestions || disabled || debouncedQuery.length < minChars) {
      setOpen(false);
      return;
    }
    search({ q: debouncedQuery, category, limit: 10 });
    setOpen(true);
    setHighlightIndex(0);
  }, [debouncedQuery, category, enableSuggestions, disabled, minChars, search]);

  const topSuggestion = suggestions[0];
  const ghost = useMemo(() => {
    if (!showGhostCompletion || !topSuggestion || open) return "";
    return getGhostCompletion(value, topSuggestion.text);
  }, [showGhostCompletion, topSuggestion, value, open]);

  const applySuggestion = useCallback(
    (suggestion: ClinicalSuggestion, mode: "replace_token" | "append") => {
      const el = textareaRef.current;
      const cursor = el?.selectionStart ?? value.length;

      let next = value;
      if (mode === "replace_token") {
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        const tokenMatch = before.match(/(\S*)$/);
        const tokenStart = tokenMatch
          ? before.length - tokenMatch[1].length
          : before.length;
        const prefix = before.slice(0, tokenStart);
        const needsSpace =
          prefix.length > 0 && !/\s$/.test(prefix) ? " " : "";
        next = `${prefix}${needsSpace}${suggestion.text}${after}`;
      } else {
        next = value ? `${value.trimEnd()} ${suggestion.text}` : suggestion.text;
      }

      onChange(next);
      recordUsage(suggestion.suggestion_id).catch(() => {});
      setOpen(false);

      requestAnimationFrame(() => {
        if (!el) return;
        el.focus();
        const pos = next.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [onChange, recordUsage, value]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pick = suggestions[highlightIndex] || suggestions[0];
        if (pick) applySuggestion(pick, "replace_token");
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }

    if (
      showGhostCompletion &&
      e.key === "Tab" &&
      topSuggestion &&
      ghost &&
      !open
    ) {
      e.preventDefault();
      applySuggestion(topSuggestion, "append");
      return;
    }

    onKeyDown?.(e);
  };

  return (
    <div className="relative">
      {ghost ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-3 py-2 text-sm whitespace-pre-wrap break-words",
            className
          )}
        >
          <span className="invisible">{value}</span>
          <span className="text-muted-foreground/50">{ghost}</span>
        </div>
      ) : null}

      <Textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => {
          if (suggestions.length && debouncedQuery.length >= minChars) setOpen(true);
        }}
        className={cn("relative z-[1] bg-transparent", className)}
        {...props}
      />

      {enableSuggestions && open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md text-sm"
          role="listbox"
        >
          {suggestions.map((s, index) => (
            <li key={s.suggestion_id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlightIndex}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-accent",
                  index === highlightIndex && "bg-accent"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s, "replace_token");
                }}
              >
                <span className="block">{s.text}</span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {s.category}
                  {s.is_pinned ? " · pinned" : ""}
                  {isFetching ? "" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
