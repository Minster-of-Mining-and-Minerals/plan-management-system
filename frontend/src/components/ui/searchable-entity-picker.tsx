"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
 * Single-select picker styled like Add Members to Group:
 * search field + scrollable selectable rows, viewport-safe popover.
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

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [options, search]);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal shadow-xs",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="flex w-[var(--radix-popover-trigger-width)] max-w-[min(100vw-1.5rem,28rem)] flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          // Keep focus on search input without scrolling the page.
          event.preventDefault();
          const container = event.currentTarget;
          if (!container) return;
          const target = container.querySelector<HTMLInputElement>(
            "input[data-searchable-entity-search]"
          );
          target?.focus();
        }}
      >
        <div className="shrink-0 border-b p-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              data-searchable-entity-search
              placeholder={searchPlaceholder}
              className="pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[min(16rem,50vh)] space-y-2 overflow-y-auto overscroll-contain p-3 pr-2">
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
      </PopoverContent>
    </Popover>
  );
}
