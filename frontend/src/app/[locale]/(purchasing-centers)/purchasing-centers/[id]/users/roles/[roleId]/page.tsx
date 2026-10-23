"use client";

import { useParams } from "next/navigation";
import CreateRole from "@/features/template/component/roleList/CreateRole";

export default function PurchasingCenterEditRolePage() {
  const params = useParams<{ id: string; roleId: string }>();
  const backPath = `/purchasing-centers/${params?.id}/users/roles`;

  return <CreateRole roleId={params?.roleId} forcePurchasingCenter={true} backPath={backPath} />;
}
