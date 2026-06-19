"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { ISSUE_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { CreateIssueModal } from "@/features/issue-management/modals/CreateIssueModal";
import type { IssueEntityType } from "@/redux/types/issue";

interface RaiseIssueButtonProps {
  entityType: IssueEntityType;
  entityId: string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default";
  className?: string;
  iconOnly?: boolean;
}

export function RaiseIssueButton({
  entityType,
  entityId,
  label = "Raise Issue",
  size = "sm",
  variant = "outline",
  className,
  iconOnly = false,
}: RaiseIssueButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PermissionGuard requireAll={[ISSUE_PERMISSIONS.CREATE]}>
        <Button
          type="button"
          size={iconOnly || size === "icon" ? "icon" : size}
          variant={variant}
          className={className}
          title="Raise Issue"
          onClick={() => setOpen(true)}
        >
          <AlertCircle className="h-4 w-4" />
          {!iconOnly && size !== "icon" && <span className="ml-1">{label}</span>}
        </Button>
      </PermissionGuard>

      <CreateIssueModal
        isOpen={open}
        onClose={() => setOpen(false)}
        defaultEntityType={entityType}
        defaultEntityId={entityId}
      />
    </>
  );
}
