"use client";

import { useParams } from "next/navigation";
import CreateRole from "@/features/template/component/roleList/CreateRole";

export default function PurchasingCenterNewRolePage() {
  const params = useParams<{ id: string }>();
  const backPath = `/purchasing-centers/${params?.id}/users/roles`;

  return <CreateRole forcePurchasingCenter={true} backPath={backPath} />;
}
