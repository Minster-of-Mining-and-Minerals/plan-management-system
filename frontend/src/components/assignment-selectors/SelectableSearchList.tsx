"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SelectableSearchListProps<T> {
    items: T[];
    getItemId: (item: T) => string;
    renderItem: (item: T) => React.ReactNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    searchPlaceholder?: string;
    emptyMessage?: string;
    isLoading?: boolean;
    disabled?: boolean;
    filterItem?: (item: T, search: string) => boolean;
    className?: string;
}

export function SelectableSearchList<T>({
    items,
    getItemId,
    renderItem,
    selectedId,
    onSelect,
    searchPlaceholder = "Search...",
    emptyMessage = "No items found",
    isLoading = false,
    disabled = false,
    filterItem,
    className,
}: SelectableSearchListProps<T>) {
    const [search, setSearch] = useState("");

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return items;
        if (filterItem) {
            return items.filter((item) => filterItem(item, query));
        }
        return items;
    }, [items, search, filterItem]);

    return (
        <div className={cn("flex min-h-0 flex-col", className)}>
            <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    placeholder={searchPlaceholder}
                    className="pl-10"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    disabled={disabled || isLoading}
                />
            </div>

            <div className="min-h-[12rem] flex-1 space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                    ))
                ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                        const itemId = getItemId(item);
                        const isSelected = selectedId === itemId;

                        return (
                            <button
                                key={itemId}
                                type="button"
                                disabled={disabled}
                                onClick={() => onSelect(itemId)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                                    disabled
                                        ? "cursor-not-allowed opacity-60"
                                        : "cursor-pointer hover:bg-gray-50",
                                    isSelected && "border-primary/40 bg-primary/5"
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                        isSelected
                                            ? "border-primary bg-primary"
                                            : "border-gray-300 bg-white"
                                    )}
                                    aria-hidden
                                >
                                    {isSelected ? (
                                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                    ) : null}
                                </span>
                                <div className="min-w-0 flex-1">{renderItem(item)}</div>
                            </button>
                        );
                    })
                ) : (
                    <div className="py-8 text-center text-sm text-gray-500">{emptyMessage}</div>
                )}
            </div>
        </div>
    );
}
