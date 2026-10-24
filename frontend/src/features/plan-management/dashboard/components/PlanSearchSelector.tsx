"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ListTree, X, Check, Loader2, Building, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetPlanVersionsQuery } from "@/redux/api/planApi";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";

interface PlanSearchSelectorProps {
  state: PlanDashboardFiltersState;
  onPrimary?: boolean;
}

export function PlanSearchSelector({ state, onPrimary = false }: PlanSearchSelectorProps) {
  const { filters, updateFilter, data } = state;
  const [searchTerm, setSearchTerm] = useState(filters.planSearch || "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      updateFilter("planSearch", searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, updateFilter]);

  // Query actual plan versions matching search term
  const {
    data: searchResults = [],
    isLoading: isSearching,
  } = useGetPlanVersionsQuery(
    {
      search: debouncedSearch.trim() || undefined,
      version_kind: "master",
      view: "summary",
    },
    { skip: !isOpen && !debouncedSearch }
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPlanId = filters.masterPlanVersionId;
  const selectedPlan = data.plans.find((p) => p.plan_version_id === selectedPlanId);

  const handleSelectPlan = (planVersionId: string) => {
    updateFilter("masterPlanVersionId", planVersionId);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    updateFilter("masterPlanVersionId", "auto");
    setSearchTerm("");
    updateFilter("planSearch", "");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative min-w-[260px] flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search plan name, gold, code, structure…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={cn(
            "h-9 pl-9 pr-8 text-xs font-medium rounded-xl transition-all shadow-none",
            onPrimary
              ? "bg-primary-foreground/95 border-primary-foreground/20 text-foreground placeholder:text-muted-foreground focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary"
              : "bg-white border-border text-foreground"
          )}
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              updateFilter("planSearch", "");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Selected Active Plan Indicator */}
      {selectedPlanId !== "auto" && selectedPlan && (
        <div className="mt-1.5 flex items-center justify-between gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary">
          <div className="flex items-center gap-1.5 min-w-0">
            <ListTree className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold truncate">
              {selectedPlan.draft_name} ({selectedPlan.start_year}–{selectedPlan.end_year})
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-primary hover:text-primary/70 shrink-0 font-bold ml-1"
            title="Reset to automatic focus"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search & Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-popover p-1 shadow-lg max-h-72 overflow-y-auto text-popover-foreground">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Matching Plans ({searchResults.length})</span>
            {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={handleClearSelection}
              className={cn(
                "w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors",
                selectedPlanId === "auto"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div className="space-y-0.5">
                <p className="font-medium">Automatic (First Active Plan in Execution)</p>
                <p className="text-[10px] text-muted-foreground">Portfolio-wide default selection</p>
              </div>
              {selectedPlanId === "auto" && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>

            {searchResults.length === 0 && !isSearching && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching plans found for &quot;{debouncedSearch}&quot;
              </div>
            )}

            {searchResults.map((plan) => {
              const isSelected = selectedPlanId === plan.plan_version_id;
              return (
                <button
                  key={plan.plan_version_id}
                  type="button"
                  onClick={() => handleSelectPlan(plan.plan_version_id)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-start justify-between gap-2 transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-semibold truncate text-foreground">
                      {plan.draft_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {plan.start_year}–{plan.end_year}
                      </span>
                      {plan.governmentStructure?.name && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <Building className="h-3 w-3" />
                          {plan.governmentStructure.name}
                        </span>
                      )}
                      <Badge
                        variant={plan.process_started_at ? "default" : "outline"}
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        {plan.process_started_at ? "In Execution" : plan.status}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
