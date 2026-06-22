import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PermissionItem } from "./PermissionItem";
import { ResourceGroup as ResourceGroupType } from "../../types/permission";

interface ResourceGroupProps {
  group: ResourceGroupType;
  onToggle: (id: string) => Promise<void>;
  isToggling: boolean;
  onToggleExpand: (resource: string) => void;
}

export const ResourceGroup: React.FC<ResourceGroupProps> = ({
  group,
  onToggle,
  isToggling,
  onToggleExpand,
}) => {
  const isAllActive = group.activeCount === group.totalCount;
  const isSomeActive =
    group.activeCount > 0 && group.activeCount < group.totalCount;

  const getSelectionStatusText = () => {
    if (isAllActive) return "All Active";
    if (isSomeActive) return "Partial";
    return "All Inactive";
  };

  const getSelectionStatusClass = () => {
    if (isAllActive) return "bg-success/10 text-success border-success/30";
    if (isSomeActive) return "bg-warning/10 text-warning border-warning/30";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="self-start rounded-lg border border-border">
      <div
        onClick={() => onToggleExpand(group.resource)}
        className="flex cursor-pointer items-center justify-between rounded-t-lg bg-muted/40 p-4 transition-all duration-200 hover:bg-primary/10"
      >
        <div className="flex flex-1 items-center space-x-3">
          <button
            type="button"
            onClick={() => onToggleExpand(group.resource)}
            className="rounded p-1 hover:bg-muted"
          >
            {group.isExpanded ? (
              <ChevronDown className="h-5 w-5 cursor-pointer text-primary" />
            ) : (
              <ChevronRight className="h-5 w-5 cursor-pointer text-primary" />
            )}
          </button>
          <div className="rounded-lg bg-card p-2 text-primary shadow-sm">{group.icon}</div>
          <div>
            <h3 className="font-semibold capitalize text-primary">
              {group.resource.replace(/_/g, " ")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {group.totalCount} permissions • {group.activeCount} active
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`rounded-full border px-2 py-1 text-xs font-medium text-primary ${getSelectionStatusClass()}`}
          >
            {getSelectionStatusText()}
          </span>
        </div>
      </div>

      {/* Permissions List with Animation */}
      <AnimatePresence>
        {group.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white rounded-b-lg border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.permissions.map((permission) => (
                  <PermissionItem
                    key={permission.permission_id}
                    permission={permission}
                    onToggle={onToggle}
                    isToggling={isToggling}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
