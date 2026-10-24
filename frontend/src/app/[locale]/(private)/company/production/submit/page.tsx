"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function CompanyProductionSubmitAliasPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const companyId = session?.user?.company_id;
      if (companyId) {
        router.replace(`/companies/${companyId}/production/submit`);
      } else {
        router.replace("/admin/production/dashboard");
      }
    } else if (status === "unauthenticated") {
      router.replace("/admin/companies");
    }
  }, [status, session, router]);

  return <Loading01 />;
}
