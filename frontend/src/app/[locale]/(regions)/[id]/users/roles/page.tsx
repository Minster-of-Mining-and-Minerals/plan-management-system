"use client";

import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import RegionalRoleList from "@/features/template/component/roleList/RegionalRoleList";

export default function RegionalRolesPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const isRegionsPrefixed = pathname.includes("/regions/");
  const basePath = params?.id
    ? isRegionsPrefixed
      ? `/regions/${params.id}/users/roles`
      : `/${params.id}/users/roles`
    : "/regional/users/roles";

  return <RegionalRoleList basePath={basePath} />;
}
