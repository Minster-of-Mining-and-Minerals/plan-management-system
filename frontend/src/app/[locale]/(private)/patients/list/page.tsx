"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGetPatientsQuery } from "@/redux/api/patientApi";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { CreatePatientModal } from "@/components/common/modals/CreatePatientModal";
import type { ActionButton } from "@/types/tableLayout";
import { Plus } from "lucide-react";

export default function PatientListPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [openCreate, setOpenCreate] = useState(false);

  const { data: patients = [], isLoading, refetch } = useGetPatientsQuery(
    searchQuery ? { search: searchQuery } : undefined
  );

  const actions: ActionButton[] = [
    {
      label: "Register Patient",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: ["PATIENTS:CREATE"],
      onClick: () => setOpenCreate(true),
    },
  ];

  if (isLoading) return <Loading01 />;

  return (
    <>
      <TableLayout title="Patient Registry" actions={actions}>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">Patient ID</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const profile =
                  p.profile ??
                  (p as { patientProfile?: typeof p.profile }).patientProfile;
                return (
                  <tr key={p.user_id} className="border-b">
                    <td className="p-3">
                      <Badge variant="outline">
                        {profile?.patient_code || "—"}
                      </Badge>
                    </td>
                    <td className="p-3">{p.full_name}</td>
                    <td className="p-3">{p.phone_number || "—"}</td>
                    <td className="p-3 capitalize">
                      {profile?.patient_status || "active"}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/patients/list/${p.user_id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!patients.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TableLayout>

      <CreatePatientModal
        isOpen={openCreate}
        onClose={() => {
          setOpenCreate(false);
          refetch();
        }}
      />
    </>
  );
}
