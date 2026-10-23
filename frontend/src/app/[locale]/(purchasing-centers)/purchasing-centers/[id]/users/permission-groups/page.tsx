"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import PermissionGroupList from "@/features/template/component/permissionGroupList/PermissionGroupList";
import { PURCHASING_CENTER_PERMISSION_GROUP_CONFIG } from "@/features/template/component/permissionGroupList/permissionGroupSectionConfig";

export default function PurchasingCenterPermissionGroupsPage() {
  const params = useParams<{ id: string }>();
  const basePath = `/purchasing-centers/${params?.id}/users/permission-groups`;

  const config = useMemo(
    () => ({
      ...PURCHASING_CENTER_PERMISSION_GROUP_CONFIG,
      basePath,
    }),
    [basePath]
  );

  return <PermissionGroupList config={config} />;
}
