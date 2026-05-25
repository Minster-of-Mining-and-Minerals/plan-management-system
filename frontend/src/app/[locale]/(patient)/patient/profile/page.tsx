"use client";

import { useSession } from "next-auth/react";
import { useGetMyPatientProfileQuery } from "@/redux/api/patientApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";

export default function PatientProfilePage() {
  const { data: session } = useSession();
  const { data, isLoading } = useGetMyPatientProfileQuery();

  if (isLoading) return <Loading01 />;

  const profile = data?.profile;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {session?.user?.name || data?.full_name}
          </p>
          <p>
            <span className="text-muted-foreground">Email: </span>
            {data?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Phone: </span>
            {data?.phone_number || "—"}
          </p>
          {profile?.patient_code && (
            <p>
              <span className="text-muted-foreground">Patient ID: </span>
              <Badge variant="secondary">{profile.patient_code}</Badge>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
