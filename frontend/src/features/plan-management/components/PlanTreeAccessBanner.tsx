"use client";

import { Badge } from "@/components/ui/badge";
import { Eye, Globe, Building2, UserCheck, AlertCircle } from "lucide-react";
import type { PlanAccessRole } from "@/redux/types/plan";
import {
  planAccessRoleBadgeLabel,
  planTreeAccessModeDescription,
  planTreeAccessModeLabel,
  type PlanTreeAccessMode,
  isOversightReadOnlyAccessRole,
} from "@/utils/planTreeAccessUtils";

type PlanTreeAccessBannerProps = {
  treeAccessMode?: PlanTreeAccessMode;
  accessRole?: PlanAccessRole;
  hierarchyEmpty?: boolean;
};

function AccessIcon({ mode }: { mode: PlanTreeAccessMode | undefined }) {
  switch (mode) {
    case "full":
      return <Globe className="h-4 w-4 shrink-0" />;
    case "sector":
      return <Building2 className="h-4 w-4 shrink-0" />;
    case "direct":
      return <UserCheck className="h-4 w-4 shrink-0" />;
    case "none":
      return <AlertCircle className="h-4 w-4 shrink-0" />;
    default:
      return <Eye className="h-4 w-4 shrink-0" />;
  }
}

export function PlanTreeAccessBanner({
  treeAccessMode,
  accessRole,
  hierarchyEmpty = false,
}: PlanTreeAccessBannerProps) {
  if (!treeAccessMode && !accessRole) {
    return null;
  }

  const isReadOnly = isOversightReadOnlyAccessRole(accessRole);
  const showEmptyHint = hierarchyEmpty && treeAccessMode === "none";

  const tone =
    treeAccessMode === "none"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : isReadOnly
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tone}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2">
          <AccessIcon mode={treeAccessMode} />
          <div className="space-y-1">
            <p className="font-medium">
              {planTreeAccessModeLabel(treeAccessMode)}
              {isReadOnly && " — read-only"}
            </p>
            <p>{planTreeAccessModeDescription(treeAccessMode)}</p>
            {showEmptyHint && (
              <p>
                If you expected to see nodes, ask an administrator to confirm your plan
                assignments or special permission group membership.
              </p>
            )}
          </div>
        </div>
        {accessRole && accessRole !== "participant" && (
          <Badge variant="outline" className="shrink-0 self-start">
            {planAccessRoleBadgeLabel(accessRole)}
          </Badge>
        )}
      </div>
    </div>
  );
}
