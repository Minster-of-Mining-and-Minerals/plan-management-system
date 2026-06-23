"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useStructureScope } from "@/hooks/useStructureScope";

export type GovernmentStructureListQuery = {
  is_active?: boolean;
  search?: string;
  parent_id?: string;
};

/**
 * Builds RTK Query params for government-structure lists.
 * Super Admin: optional filters only. Sector users: server scopes to their subtree.
 */
export function useGovernmentStructureListParams(
  extra?: GovernmentStructureListQuery
) {
  const { isSuperAdmin, structureId } = useStructureScope();
  const isLoaded = useSelector((state: RootState) => state.auth.isLoaded);
  const isActive = extra?.is_active;
  const search = extra?.search;
  const parentId = extra?.parent_id;

  const params = useMemo((): GovernmentStructureListQuery | undefined => {
    const next: GovernmentStructureListQuery = {};
    if (isActive !== undefined) next.is_active = isActive;
    if (search) next.search = search;
    if (parentId) next.parent_id = parentId;
    return Object.keys(next).length > 0 ? next : undefined;
  }, [isActive, search, parentId]);

  const skip = !isLoaded || (!isSuperAdmin && !structureId);

  return {
    params,
    skip,
    isSuperAdmin,
    structureId,
    isLoaded,
  };
}
