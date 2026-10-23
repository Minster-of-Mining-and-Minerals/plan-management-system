"use client";

import { useParams } from "next/navigation";
import PurchasingCenterRoleList from "@/features/template/component/roleList/PurchasingCenterRoleList";

export default function PurchasingCenterRolesPage() {
  const params = useParams<{ id: string }>();
  const basePath = `/purchasing-centers/${params?.id}`;

  return <PurchasingCenterRoleList basePath={basePath} purchasingCenterId={params?.id} />;
}
