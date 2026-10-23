"use client";

import { useParams } from "next/navigation";
import CompanyRoleList from "@/features/template/component/roleList/CompanyRoleList";

export default function CompanyRolesPage() {
  const params = useParams<{ id: string }>();
  const basePath = params?.id
    ? `/companies/${params.id}/users/roles`
    : "/company/users/roles";

  return <CompanyRoleList basePath={basePath} />;
}
