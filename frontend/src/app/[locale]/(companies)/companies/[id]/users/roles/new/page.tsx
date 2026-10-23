"use client";

import { useParams } from "next/navigation";
import CreateRole from "@/features/template/component/roleList/CreateRole";

export default function CompanyNewRolePage() {
  const params = useParams<{ id: string }>();
  const backPath = params?.id
    ? `/companies/${params.id}/users/roles`
    : "/company/users/roles";

  return <CreateRole forceCompany={true} backPath={backPath} />;
}
