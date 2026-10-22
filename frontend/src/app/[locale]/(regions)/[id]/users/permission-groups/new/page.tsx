"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import CreatePermissionGroup from "@/features/template/component/permissionGroupList/CreatePermissionGroup";
import { REGIONAL_PERMISSION_GROUP_CONFIG } from "@/features/template/component/permissionGroupList/permissionGroupSectionConfig";

export default function RegionalNewPermissionGroupPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const isRegionsPrefixed = pathname.includes("/regions/");
  const basePath = params?.id
    ? isRegionsPrefixed
      ? `/regions/${params.id}/users/permission-groups`
      : `/${params.id}/users/permission-groups`
    : "/regional/users/permission-groups";

  const config = useMemo(
    () => ({
      ...REGIONAL_PERMISSION_GROUP_CONFIG,
      basePath,
    }),
    [basePath]
  );

  return <CreatePermissionGroup config={config} />;
}
