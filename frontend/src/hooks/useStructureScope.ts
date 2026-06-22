"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

export function useStructureScope() {
  const { data: session } = useSession();
  const roles = useSelector((state: RootState) => state.auth.roles);

  const isSuperAdmin = useMemo(
    () => roles.some((role) => role.toLowerCase() === "super admin"),
    [roles]
  );

  const structureId = useMemo(() => {
    const fromSession = session?.user?.government_structure;
    if (!fromSession) return null;
    if (Array.isArray(fromSession)) {
      return fromSession[0]?.government_structure_id ?? null;
    }
    return fromSession.government_structure_id ?? null;
  }, [session?.user?.government_structure]);

  return {
    isSuperAdmin,
    structureId,
  };
}
