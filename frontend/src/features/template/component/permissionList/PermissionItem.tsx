import React from "react";
import { Switch } from "@/components/ui/switch";
import { Permission } from "../../types/permission";

interface PermissionItemProps {
  permission: Permission;
  onToggle: (id: string) => Promise<void>;
  isToggling: boolean;
}

export const PermissionItem: React.FC<PermissionItemProps> = ({
  permission,
  onToggle,
  isToggling,
}) => {
  const isActive = !!permission.is_active;

  const handleToggle = async (checked: boolean) => {
    if (checked !== isActive) {
      await onToggle(permission.permission_id);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-1 transition-colors hover:bg-muted/40">
      <span className="flex-1 text-sm font-medium capitalize text-foreground">
        {permission.action.replace("_", " ")}
      </span>

      {isToggling ? (
        <div className="flex h-10 w-10 items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <Switch
          checked={isActive}
          onCheckedChange={handleToggle}
          aria-label={
            isActive ? "Deactivate permission" : "Activate permission"
          }
        />
      )}
    </div>
  );
};
