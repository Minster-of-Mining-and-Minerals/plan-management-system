import React, { useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionButton, PageLayoutProps } from "@/types/tableLayout";
import { FilterPopover } from "./FilterDrawer";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";

export const TableLayout: React.FC<PageLayoutProps> = ({
  title,
  description,
  actions = [],
  filters = [],
  sideActions = [],
  children,
  filterColumnsPerRow = 1,
  showToggleHierarchyNode,
  toggleHierarchyNode,
  setToggleHierarchyNode,
}) => {
  const { canAny } = usePermissions();
  // Get URL state for search
  const searchParams = useSearchParams();
  const router = useRouter();

  const searchQuery = searchParams.get("search") || "";

  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("search", localSearch);
        params.set("page", "1");
        router.push(`${window.location.pathname}?${params.toString()}`);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, searchParams, router]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const filteredActions = actions.filter((action) => {
    if (!action.permissions || action.permissions.length === 0) {
      return true; // no permission required
    }
    return canAny(action.permissions as any);
  });

  return (
    <div className=" p-6 border rounded-lg w-full bg-white shadow">
      <div className="space-y-6 w-full">
        {/* Page Header - Single Line Layout */}
        <div className="flex flex-col w-full bg lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Title and Description */}
          {title && description && (
            <div>
              {title && (
                <h1 className="text-xl font-semibold text-[#073954]">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-gray-500 text-base">{description}</p>
              )}
            </div>
          )}
          <div className="flex w-fit">
            {sideActions && sideActions.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                {sideActions.map((action: ActionButton, index: number) => (
                  <Button
                    key={index}
                    variant={action.variant || "default"}
                    size={action.size || "default"}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className="flex items-center space-x-2"
                  >
                    {action.icon && (
                      <span className="h-4 w-4">{action.icon}</span>
                    )}
                    <span>{action.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
          {/* Right side - Search, Filters, and Actions in one line */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            {showToggleHierarchyNode && (
              <Select
                value={toggleHierarchyNode ? "hierarchy" : "list"}
                onValueChange={(value: string) =>
                  setToggleHierarchyNode?.(value === "hierarchy" ? true : false)
                }
              >
                <SelectTrigger className="w-40 bg-white text-gray-700 border-gray-300 focus:ring-0">
                  <SelectValue placeholder="Hierarchy View" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem
                    value="list"
                    className="text-gray-700 hover:bg-gray-200"
                  >
                    List View
                  </SelectItem>
                  <SelectItem
                    value="hierarchy"
                    className="text-gray-700 hover:bg-gray-200"
                  >
                    Hierarchy View
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Filters */}
            {filters.length > 0 && (
              <FilterPopover
                filters={filters}
                columnsPerRow={filterColumnsPerRow}
              />
            )}

            {filteredActions.length > 0 && (
              <div className="flex items-center space-x-2">
                {filteredActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "default"}
                    size={action.size || "default"}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className="flex items-center space-x-2"
                  >
                    {action.loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      action.icon && (
                        <span className="h-4 w-4">{action.icon}</span>
                      )
                    )}
                    <span>{action.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white">{children}</div>
      </div>
    </div>
  );
};
