"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { FilterPopover } from "@/features/template/component/tableList/FilterDrawer";

interface DashboardTableLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  filters?: FilterField[];
  actions?: ActionButton[];
  filterColumnsPerRow?: number;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
}

export function DashboardTableLayout({
  title,
  description,
  children,
  filters = [],
  actions = [],
  filterColumnsPerRow = 1,
  searchPlaceholder = "Search...",
  onSearchChange,
  searchValue: controlledSearch,
}: DashboardTableLayoutProps) {
  const [localSearch, setLocalSearch] = useState("");
  const searchValue = controlledSearch ?? localSearch;

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  return (
    <div className="rounded-lg border w-full bg-white shadow">
      <div className="space-y-6 w-full p-6">
        <div className="flex flex-col w-full lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">{title}</h2>
            {description && <p className="text-gray-500 text-base">{description}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            {filters.length > 0 && (
              <FilterPopover filters={filters} columnsPerRow={filterColumnsPerRow} />
            )}

            {actions.length > 0 && (
              <div className="flex items-center gap-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={action.variant || "default"}
                    size={action.size || "default"}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className="flex items-center gap-2"
                  >
                    {action.loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      action.icon
                    )}
                    <span>{action.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white">{children}</div>
      </div>
    </div>
  );
}
