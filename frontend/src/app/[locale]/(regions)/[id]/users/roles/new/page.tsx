"use client";

import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import CreateRole from "@/features/template/component/roleList/CreateRole";

export default function RegionalNewRolePage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const isRegionsPrefixed = pathname.includes("/regions/");
  const backPath = params?.id
    ? isRegionsPrefixed
      ? `/regions/${params.id}/users/roles`
      : `/${params.id}/users/roles`
    : "/regional/users/roles";

  return <CreateRole forceRegional={true} backPath={backPath} />;
}
