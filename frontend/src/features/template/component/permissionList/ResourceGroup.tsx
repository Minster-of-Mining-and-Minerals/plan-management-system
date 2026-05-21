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
    if (isAllActive) return "bg-green-100 text-green-800 border-green-200";
    if (isSomeActive) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="border border-gray-200 rounded-lg self-start">
      {/* Resource Header */}
      <div
        onClick={() => onToggleExpand(group.resource)}
        className="flex transition-all hover:bg-primary/10 duration-200 cursor-pointer items-center justify-between p-4 bg-gray-50 rounded-t-lg"
      >
        <div className="flex items-center space-x-3 flex-1">
          <button
            type="button"
            onClick={() => onToggleExpand(group.resource)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {group.isExpanded ? (
              <ChevronDown className="h-5 w-5 text-primary hover:text-primary cursor-pointer" />
            ) : (
              <ChevronRight className="h-5 w-5 text-primary hover:text-primary cursor-pointer" />
            )}
          </button>
          <div className="p-2 text-primary bg-white rounded-lg shadow-sm">
            {group.icon}
          </div>
          <div>
            <h3 className="font-semibold text-primary capitalize">
              {group.resource.replace(/_/g, " ")}
            </h3>
            <p className="text-sm text-primary">
              {group.totalCount} permissions • {group.activeCount} active
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-2 py-1 text-xs font-medium border rounded-full text-primary ${getSelectionStatusClass()}`}
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
