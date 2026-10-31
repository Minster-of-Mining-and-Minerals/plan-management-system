"use client";

import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import UserDetailView from "@/features/user-management/UserDetailView";

export default function RegionalUserDetailDirectPage() {
  const params = useParams<{ id: string; userId: string }>();
  const pathname = usePathname();
  const isRegionsPrefixed = pathname.includes("/regions/");
  const backPath = params?.id
    ? isRegionsPrefixed
      ? `/regions/${params.id}/users`
      : `/${params.id}/users`
    : "/regional/users";

  return <UserDetailView userId={params?.userId} backPath={backPath} />;
}

