"use client";

import { use } from "react";
import { PatientSchedulingPage } from "@/features/patient-scheduling/PatientSchedulingPage";

export default function PatientScheduleRoutePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  return <PatientSchedulingPage patientId={patientId} />;
}
