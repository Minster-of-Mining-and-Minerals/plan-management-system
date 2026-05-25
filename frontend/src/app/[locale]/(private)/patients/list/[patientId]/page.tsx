"use client";

import { useParams } from "next/navigation";
import { useGetPatientByIdQuery } from "@/redux/api/patientApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { data, isLoading } = useGetPatientByIdQuery(patientId);

  if (isLoading) return <Loading01 />;

  const profile = data?.profile;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.full_name}
            {profile?.patient_code && (
              <Badge variant="secondary">{profile.patient_code}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Email: </span>
            {data?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Phone: </span>
            {data?.phone_number || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Status: </span>
            {profile?.patient_status || "active"}
          </p>
          {profile?.barcode && (
            <p>
              <span className="text-muted-foreground">Barcode: </span>
              {profile.barcode}
            </p>
          )}
        </CardContent>
      </Card>

      {data?.custom_fields && Object.keys(data.custom_fields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.custom_fields).map(([key, value]) => (
              <p key={key}>
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}:{" "}
                </span>
                {Array.isArray(value)
                  ? value.join(", ")
                  : String(value ?? "—")}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
