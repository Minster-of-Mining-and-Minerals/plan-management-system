"use client";

import * as React from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface NormalizedTargetUnit {
  id: string;
  label: string;
  symbol?: string;
  category?: string;
  isCustom?: boolean;
}

export interface TargetUnitPickerProps {
  id?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  units?: Array<NormalizedTargetUnit | string | any>;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
  noneLabel?: string;
  showSymbolBadge?: boolean;
}

export function TargetUnitPicker({
  id,
  value,
  onChange,
  units = [],
  placeholder = "Select target unit...",
  searchPlaceholder = "Filter units (e.g. kg, USD, %)...",
  disabled = false,
  allowCustom = true,
  className,
  noneLabel = "None (No unit)",
  showSymbolBadge = true,
}: TargetUnitPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Normalize, deduplicate, and ALPHABETICALLY sort all incoming units
  const normalizedUnits = React.useMemo<NormalizedTargetUnit[]>(() => {
    const map = new Map<string, NormalizedTargetUnit>();

    const processUnit = (raw: any, index: number) => {
      if (!raw) return;
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: trimmed,
            label: trimmed,
            symbol: trimmed,
          });
        }
      } else if (typeof raw === "object") {
        const id = (raw.id || raw.label || raw.name || `unit-${index}`).toString().trim();
        const label = (raw.label || raw.name || id).toString().trim();
        const symbol = raw.symbol ? raw.symbol.toString().trim() : undefined;
        const category = raw.category ? raw.category.toString().trim() : undefined;
        if (!label) return;
        const key = label.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: id || label,
            label,
            symbol: symbol || label,
            category,
          });
        }
      }
    };

    if (Array.isArray(units)) {
      units.forEach(processUnit);
    }

    // Sort alphabetically (A - Z) by unit label
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base", numeric: true })
    );
  }, [units]);

  // Match current selected value
  const matchedUnit = React.useMemo<NormalizedTargetUnit | null>(() => {
    if (!value || value.trim() === "") return null;
    const trimmedVal = value.trim().toLowerCase();
    const found = normalizedUnits.find(
      (u) =>
        u.id.toLowerCase() === trimmedVal ||
        u.label.toLowerCase() === trimmedVal ||
        (u.symbol && u.symbol.toLowerCase() === trimmedVal)
    );
    if (found) return found;

    // Custom unit not currently in configured list
    return {
      id: value.trim(),
      label: value.trim(),
      symbol: value.trim(),
      isCustom: true,
    };
  }, [value, normalizedUnits]);

  // Filtered list based on search input
  const filteredUnits = React.useMemo<NormalizedTargetUnit[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalizedUnits;
    return normalizedUnits.filter(
      (u) =>
        u.label.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.symbol && u.symbol.toLowerCase().includes(q)) ||
        (u.category && u.category.toLowerCase().includes(q))
    );
  }, [normalizedUnits, search]);

  const canAddCustom = React.useMemo(() => {
    if (!allowCustom) return false;
    const q = search.trim();
    if (!q) return false;
    const lower = q.toLowerCase();
    return !normalizedUnits.some(
      (u) =>
        u.label.toLowerCase() === lower ||
        u.id.toLowerCase() === lower ||
        (u.symbol && u.symbol.toLowerCase() === lower)
    );
  }, [allowCustom, search, normalizedUnits]);

  // Outside click & escape handling
  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Focus search input upon opening
  React.useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  const handleSelectUnit = (unit: NormalizedTargetUnit | null) => {
    if (!unit) {
      onChange(null);
    } else {
      onChange(unit.id || unit.label);
    }
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
  };

  const handleCustomSubmit = () => {
    const trimmed = search.trim();
    if (trimmed) {
      onChange(trimmed);
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full min-w-0", className)}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !matchedUnit && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {matchedUnit ? (
            <>
              <span className="font-medium text-foreground truncate">{matchedUnit.label}</span>
              {showSymbolBadge && matchedUnit.symbol && matchedUnit.symbol !== matchedUnit.label && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono font-normal">
                  {matchedUnit.symbol}
                </Badge>
              )}
              {matchedUnit.isCustom && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 text-muted-foreground">
                  custom
                </Badge>
              )}
            </>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {matchedUnit && !disabled && (
            <span
              role="button"
              tabIndex={0}
              title="Clear unit"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
              className="p-0.5 rounded hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown className={cn("size-4 transition-transform duration-200 opacity-60", open && "rotate-180")} />
        </div>
      </button>

      {/* Dropdown Menu Container */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[90] mt-1 flex max-h-[min(19rem,50vh)] w-full min-w-[14rem] flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {/* Search Box Header */}
          <div className="shrink-0 border-b border-border/70 p-2 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredUnits.length > 0) {
                      handleSelectUnit(filteredUnits[0]);
                    } else if (canAddCustom) {
                      handleCustomSubmit();
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                className="h-8 pl-8 pr-7 text-xs bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>Alphabetical (A–Z)</span>
              <span>{filteredUnits.length} {filteredUnits.length === 1 ? "unit" : "units"}</span>
            </div>
          </div>

          {/* Scrollable Items List */}
          <div
            ref={listRef}
            onWheel={(e) => e.stopPropagation()}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-1 divide-y divide-border/20 text-xs"
          >
            {/* None Option */}
            <div
              role="option"
              aria-selected={!matchedUnit}
              onClick={() => handleSelectUnit(null)}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground",
                !matchedUnit && "bg-accent/60 font-medium text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground italic">{noneLabel}</span>
              </div>
              {!matchedUnit && <Check className="size-3.5 text-primary shrink-0" />}
            </div>

            {/* Filtered Alphabetical Units */}
            {filteredUnits.map((unit) => {
              const isSelected =
                matchedUnit?.id.toLowerCase() === unit.id.toLowerCase() ||
                matchedUnit?.label.toLowerCase() === unit.label.toLowerCase();

              return (
                <div
                  key={unit.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectUnit(unit)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-sm px-2.5 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span className="truncate">{unit.label}</span>
                    {unit.symbol && unit.symbol !== unit.label && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({unit.symbol})
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
                </div>
              );
            })}

            {/* Empty state & custom unit creator */}
            {filteredUnits.length === 0 && (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">No units found matching &ldquo;{search}&rdquo;</p>
                {canAddCustom && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCustomSubmit}
                    className="h-7 text-xs w-full gap-1.5"
                  >
                    <Plus className="size-3 text-primary" />
                    Use &ldquo;{search.trim()}&rdquo; as custom unit
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quick action for custom unit if search text is novel and matches exist */}
          {filteredUnits.length > 0 && canAddCustom && (
            <div className="shrink-0 border-t border-border/70 p-1.5 bg-muted/20">
              <button
                type="button"
                onClick={handleCustomSubmit}
                className="w-full flex items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] text-primary hover:bg-primary/10 transition-colors font-medium"
              >
                <Plus className="size-3" />
                Use &ldquo;{search.trim()}&rdquo; as custom unit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

