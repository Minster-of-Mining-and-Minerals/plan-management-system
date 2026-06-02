"use client";

import { useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import DetailHeader from "@/components/common/DetailHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPharmacyByIdQuery } from "@/redux/api/pharmacyApi";
import { PharmacyUserTable } from "./PharmacyUserTable";
import { normalizePharmacyUsers } from "./pharmacyUserUtils";

type Props = { pharmacyId: string };

export function PharmacyDetailPage({ pharmacyId }: Props) {
  const router = useRouter();
  const { data: pharmacy, isLoading, refetch } = useGetPharmacyByIdQuery(pharmacyId);

  const pharmacyUsers = useMemo(
    () => normalizePharmacyUsers(pharmacy?.users),
    [pharmacy?.users]
  );

  if (isLoading || !pharmacy) return <Loading01 />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DetailHeader
          breadcrumbs={[
            { title: "Pharmacies", link: "/pharmacies" },
            { title: pharmacy.pharmacy_name },
          ]}
        />
        <Button variant="outline" size="sm" onClick={() => router.push("/pharmacies")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{pharmacy.pharmacy_name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {pharmacy.pharmacy_code} · {pharmacy.status}
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>License: {pharmacy.license_number || "—"}</p>
          <p>Contact: {pharmacy.contact_person || "—"}</p>
          <p>Phone: {pharmacy.phone || "—"}</p>
          <p>Email: {pharmacy.email || "—"}</p>
          <p className="sm:col-span-2">
            Address:{" "}
            {[pharmacy.address, pharmacy.city, pharmacy.region, pharmacy.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </CardContent>
      </Card>

      <PharmacyUserTable
        pharmacyId={pharmacyId}
        pharmacyName={pharmacy.pharmacy_name}
        users={pharmacyUsers}
        onRefresh={refetch}
      />
    </div>
  );
}
