"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPatientMedicalTimelineQuery } from "@/redux/api/medicalWorkflowApi";
import { MedicalHistoryTimeline } from "./MedicalHistoryTimeline";

type Props = {
  patientId: string;
};

export function PatientMedicalTimeline({ patientId }: Props) {
  const { data = [], isLoading, isError } =
    useGetPatientMedicalTimelineQuery(patientId);

  if (isLoading) return <Loading01 />;

  if (isError) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Unable to load medical history.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Medical history timeline</CardTitle>
        <p className="text-xs text-muted-foreground">
          Chronological record across all appointments
        </p>
      </CardHeader>
      <CardContent>
        <MedicalHistoryTimeline entries={data} />
      </CardContent>
    </Card>
  );
}
