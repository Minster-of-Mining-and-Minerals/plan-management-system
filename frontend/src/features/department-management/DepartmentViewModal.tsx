"use client";

import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Department } from "@/redux/types/department";
import { cn } from "@/lib/utils";
import {
  modalOverlayClassName,
  modalPanelClassName,
} from "@/lib/modalLayout";

interface DepartmentViewModalProps {
  department: Department | null;
  onClose: () => void;
  onEdit?: () => void;
}

export function DepartmentViewModal({
  department,
  onClose,
  onEdit,
}: DepartmentViewModalProps) {
  if (!department) return null;

  return (
    <div className={modalOverlayClassName}>
      <div className={cn(modalPanelClassName, "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Department Details</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{department.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Code</dt>
            <dd className="font-medium">{department.code}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Slug</dt>
            <dd>{department.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Department Head</dt>
            <dd>{department.dept_head_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={department.status === "active" ? "default" : "secondary"}>
                {department.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{new Date(department.created_at).toLocaleString()}</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
