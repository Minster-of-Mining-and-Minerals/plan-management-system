"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function CompanyProductionDetailAliasPage() {
  const router = useRouter();
  const params = useParams<{ assignmentId: string }>();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const companyId = session?.user?.company_id;
      const assignmentId = params?.assignmentId;
      if (companyId && assignmentId) {
        router.replace(`/companies/${companyId}/productions/${assignmentId}`);
      } else {
        router.replace("/admin/production/assignments");
      }
    } else if (status === "unauthenticated") {
      router.replace("/admin/companies");
    }
  }, [status, session, params, router]);

  return <Loading01 />;
}
