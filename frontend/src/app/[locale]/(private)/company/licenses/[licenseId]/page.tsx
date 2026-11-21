"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function CompanyLicenseDetailAliasPage() {
  const router = useRouter();
  const params = useParams<{ licenseId: string }>();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      const companyId = session?.user?.company_id;
      const licenseId = params?.licenseId;
      if (companyId && licenseId) {
        router.replace(`/companies/${companyId}/licenses/${licenseId}`);
      } else {
        router.replace("/admin/licenses");
      }
    } else if (status === "unauthenticated") {
      router.replace("/admin/companies");
    }
  }, [status, session, params, router]);

  return <Loading01 />;
}
