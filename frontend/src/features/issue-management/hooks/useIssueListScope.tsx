"use client";

import { useMemo, useState } from "react";
import { List, User } from "lucide-react";
import type { ActionButton } from "@/types/tableLayout";
import { usePermissions } from "@/hooks/usePermissions";
import type { IssueListScope } from "@/redux/types/issue";
import {
  canViewIssueGlobal,
  canViewIssueSelf,
  resolveDefaultIssueListScope,
} from "../utils/issueListScopeUtils";

function resolveEffectiveIssueListScope(
  preferred: IssueListScope,
  canGlobal: boolean,
  canMine: boolean
): IssueListScope {
  if (preferred === "global" && canGlobal) {
    return "global";
  }
  if (preferred === "mine" && canMine) {
    return "mine";
  }
  if (canGlobal) {
    return "global";
  }
  return "mine";
}

export function useIssueListScope() {
  const { can } = usePermissions();
  const canGlobal = canViewIssueGlobal(can);
  const canMine = canViewIssueSelf(can);

  const [preferredScope, setPreferredScope] = useState<IssueListScope>(() =>
    resolveDefaultIssueListScope(can)
  );

  const listScope = useMemo(
    () => resolveEffectiveIssueListScope(preferredScope, canGlobal, canMine),
    [preferredScope, canGlobal, canMine]
  );

  const sideActions: ActionButton[] = useMemo(() => {
    const tabs: ActionButton[] = [];
    if (canGlobal) {
      tabs.push({
        label: "Issues",
        icon: <List className="h-4 w-4" />,
        variant: listScope === "global" ? "default" : "outline",
        size: "default",
        onClick: () => setPreferredScope("global"),
      });
    }
    if (canMine) {
      tabs.push({
        label: "My Issues",
        icon: <User className="h-4 w-4" />,
        variant: listScope === "mine" ? "default" : "outline",
        size: "default",
        onClick: () => setPreferredScope("mine"),
      });
    }
    return tabs;
  }, [canGlobal, canMine, listScope]);

  return {
    listScope,
    setListScope: setPreferredScope,
    sideActions,
    canGlobal,
    canMine,
    showScopeTabs: canGlobal && canMine,
  };
}
