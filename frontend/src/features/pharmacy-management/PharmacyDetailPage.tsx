"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import DetailHeader from "@/components/common/DetailHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetPharmacyByIdQuery,
  useCreatePharmacyUserMutation,
} from "@/redux/api/pharmacyApi";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/common/PermissionGuard";

type Props = { pharmacyId: string };

export function PharmacyDetailPage({ pharmacyId }: Props) {
  const router = useRouter();
  const { data: pharmacy, isLoading, refetch } = useGetPharmacyByIdQuery(pharmacyId);
  const [createUser, { isLoading: creating }] = useCreatePharmacyUserMutation();
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    password: "",
    portal_role: "staff",
  });

  if (isLoading || !pharmacy) return <Loading01 />;

  const handleCreateUser = async () => {
    try {
      await createUser({ pharmacyId, body: userForm }).unwrap();
      toast.success("Pharmacy user created");
      setUserForm({ full_name: "", email: "", password: "", portal_role: "staff" });
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to create user";
      toast.error(message);
    }
  };

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
            Address: {[pharmacy.address, pharmacy.city, pharmacy.region, pharmacy.country]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pharmacy users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(pharmacy.users || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No pharmacy users yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pharmacy.users?.map((u) => (
                <li key={u.pharmacy_user_profile_id} className="rounded border p-2">
                  {u.user?.full_name} · {u.user?.email} · {u.portal_role}
                </li>
              ))}
            </ul>
          )}

          <PermissionGuard requireAny={["PHARMACY:USER_MANAGE"]}>
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add pharmacy user
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={userForm.full_name}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, full_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button size="sm" onClick={handleCreateUser} disabled={creating}>
                {creating ? "Creating…" : "Create user"}
              </Button>
            </div>
          </PermissionGuard>
        </CardContent>
      </Card>
    </div>
  );
}
