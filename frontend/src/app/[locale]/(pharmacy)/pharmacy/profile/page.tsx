"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPharmacyPortalProfileQuery } from "@/redux/api/pharmacyPortalApi";
import { PORTAL_ROLE_LABELS } from "@/features/pharmacy-management/pharmacyUserUtils";

export default function PharmacyProfilePage() {
  const { data, isLoading } = useGetPharmacyPortalProfileQuery();

  if (isLoading) return <Loading01 />;

  const roleLabel =
    data?.portal_role &&
    PORTAL_ROLE_LABELS[data.portal_role as keyof typeof PORTAL_ROLE_LABELS];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your pharmacy portal account and role
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{data?.user.full_name}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Email</span>
            <span>{data?.user.email}</span>
          </div>
          <div className="flex justify-between gap-2 items-center">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="outline" className="capitalize">
              {roleLabel || data?.portal_role || "—"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pharmacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span>{" "}
            {data?.pharmacy.pharmacy_name}
          </p>
          <p>
            <span className="text-muted-foreground">Code:</span>{" "}
            {data?.pharmacy.pharmacy_code}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
