"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPharmacyPortalProfileQuery } from "@/redux/api/pharmacyPortalApi";

export default function PharmacyProfilePage() {
  const { data, isLoading } = useGetPharmacyPortalProfileQuery();

  if (isLoading) return <Loading01 />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pharmacy profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">User:</span> {data?.user.full_name} (
          {data?.user.email})
        </p>
        <p>
          <span className="text-muted-foreground">Pharmacy:</span>{" "}
          {data?.pharmacy.pharmacy_name} ({data?.pharmacy.pharmacy_code})
        </p>
        <p>
          <span className="text-muted-foreground">Role:</span> {data?.portal_role}
        </p>
      </CardContent>
    </Card>
  );
}
