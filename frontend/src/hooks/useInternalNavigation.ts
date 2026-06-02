"use client";

import { useMemo } from "react";
import { Store } from "lucide-react";
import { NAVIGATION, type NavItem } from "@/navigation.config";
import { useGetPharmaciesQuery } from "@/redux/api/pharmacyApi";
import { usePermissions } from "@/hooks/usePermissions";
import { hasAnyPermission, type PermissionKey } from "@/lib/permissions";

const PHARMACY_NAV_PERMISSIONS: PermissionKey[] = [
  "PHARMACY:VIEW",
  "PHARMACY:MANAGE",
  "PHARMACY:CREATE",
  "PHARMACY:USER_MANAGE",
];

function buildPharmacyNavItem(
  base: NavItem,
  pharmacies: { pharmacy_id: string; pharmacy_name: string; status: string }[]
): NavItem {
  const pharmacyChildren: NavItem[] = [...pharmacies]
    .sort((a, b) => a.pharmacy_name.localeCompare(b.pharmacy_name))
    .map((pharmacy) => ({
      title: pharmacy.pharmacy_name,
      url: `/pharmacies/${pharmacy.pharmacy_id}`,
      icon: Store,
      anyPermissions: [...PHARMACY_NAV_PERMISSIONS],
    }));

  if (pharmacyChildren.length === 0) {
    return base;
  }

  return {
    ...base,
    children: pharmacyChildren,
  };
}

/** Internal staff nav with dynamic pharmacy detail links under Pharmacies. */
export function useInternalNavigation(): NavItem[] {
  const { permissions } = usePermissions();
  const canViewPharmacies = hasAnyPermission(permissions, PHARMACY_NAV_PERMISSIONS);

  const { data: pharmacies = [] } = useGetPharmaciesQuery(undefined, {
    skip: !canViewPharmacies,
  });

  return useMemo(
    () =>
      NAVIGATION.map((item) =>
        item.title === "Pharmacies"
          ? buildPharmacyNavItem(item, pharmacies)
          : item
      ),
    [pharmacies]
  );
}
