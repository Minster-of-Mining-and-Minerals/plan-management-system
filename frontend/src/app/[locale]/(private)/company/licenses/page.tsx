"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function CompanyLicensesAliasPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const companyId = session?.user?.company_id;
      if (companyId) {
        router.replace(`/companies/${companyId}/licenses`);
      } else {
        router.replace("/admin/licenses");
      }
    } else if (status === "unauthenticated") {
      router.replace("/admin/companies");
    }
  }, [status, session, router]);

  return <Loading01 />;
}
