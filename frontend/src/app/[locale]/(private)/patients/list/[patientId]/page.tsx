"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useGetPatientByIdQuery } from "@/redux/api/patientApi";
import { useGetUserFormConfigQuery } from "@/redux/api/formFieldApi";
import { PatientDetailPanel } from "@/features/patient-management/PatientDetailPanel";
import { PatientIdentificationSlip } from "@/features/patient-management/PatientIdentificationSlip";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { Button } from "@/components/ui/button";

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { data: patient, isLoading, isError } = useGetPatientByIdQuery(patientId);
  const { data: formConfig } = useGetUserFormConfigQuery();

  if (isLoading) return <Loading01 />;

  if (isError || !patient) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/patients/list">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to patients
          </Link>
        </Button>
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/patients/list">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to patients
          </Link>
        </Button>
        <h1 className="text-xl font-semibold text-primary truncate">
          {patient.full_name}
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-6 items-start">
        <PatientDetailPanel patient={patient} formConfig={formConfig} />
        <div className="xl:sticky xl:top-4 w-full xl:w-auto flex justify-center xl:justify-start">
          <PatientIdentificationSlip patient={patient} />
        </div>
      </div>
    </div>
  );
}
