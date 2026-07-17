"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SearchableEntityOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchableEntityPickerProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableEntityOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Single-select picker styled like Add Members to Group.
 * Renders an in-place dropdown (no portal) so mouse-wheel scrolling works
 * inside Radix Dialogs used by plan amendment modals.
 */
export function SearchableEntityPicker({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches found",
  disabled = false,
  className,
}: SearchableEntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const haystack =
        `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [options, search]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
        setSearch("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        className={cn(
          "h-9 w-full min-w-0 justify-between px-3 font-normal shadow-xs",
          !selected && "text-muted-foreground"
        )}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate text-left">{selected?.label ?? placeholder}</span>
        <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-[80] mt-1 flex max-h-[min(18rem,50vh)] w-full min-w-0 flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          role="listbox"
        >
          <div className="shrink-0 border-b p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                data-searchable-entity-search
                placeholder={searchPlaceholder}
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 pr-2"
            onWheel={(event) => {
              // Prevent Dialog / parent scroll-lock from eating wheel events.
              event.stopPropagation();
            }}
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex cursor-pointer items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50",
                      isSelected && "border-golden-dark/40 bg-golden-dark/5"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300",
                        isSelected &&
                          "border-golden-dark bg-golden-dark text-white"
                      )}
                      aria-hidden
                    >
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <div className="min-w-0 flex-1 flex-col">
                      <span className="block truncate font-medium">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="block truncate text-xs text-gray-500">
                          {option.description}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
