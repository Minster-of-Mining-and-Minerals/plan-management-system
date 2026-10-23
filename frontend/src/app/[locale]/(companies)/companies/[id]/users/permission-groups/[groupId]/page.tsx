"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import CreatePermissionGroup from "@/features/template/component/permissionGroupList/CreatePermissionGroup";
import { COMPANY_PERMISSION_GROUP_CONFIG } from "@/features/template/component/permissionGroupList/permissionGroupSectionConfig";

export default function CompanyEditPermissionGroupPage() {
  const params = useParams<{ id: string; groupId: string }>();
  const basePath = params?.id
    ? `/companies/${params.id}/users/permission-groups`
    : "/company/users/permission-groups";

  const config = useMemo(
    () => ({
      ...COMPANY_PERMISSION_GROUP_CONFIG,
      basePath,
    }),
    [basePath]
  );

  return (
    <CreatePermissionGroup
      groupId={params?.groupId}
      config={config}
    />
  );
}
