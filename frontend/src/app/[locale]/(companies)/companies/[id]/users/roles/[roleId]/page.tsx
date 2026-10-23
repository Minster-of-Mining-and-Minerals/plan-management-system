"use client";

import { useParams } from "next/navigation";
import CreateRole from "@/features/template/component/roleList/CreateRole";

export default function CompanyEditRolePage() {
  const params = useParams<{ id: string; roleId: string }>();
  const backPath = params?.id
    ? `/companies/${params.id}/users/roles`
    : "/company/users/roles";

  return (
    <CreateRole
      roleId={params?.roleId}
      forceCompany={true}
      backPath={backPath}
    />
  );
}
