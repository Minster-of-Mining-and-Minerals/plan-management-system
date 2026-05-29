import { PatientScheduleHistoryPage } from "@/features/patient-management/PatientScheduleHistoryPage";

type Props = {
  params: Promise<{ patientId: string; scheduleId: string }>;
};

export default async function PatientScheduleHistoryRoute({ params }: Props) {
  const { patientId, scheduleId } = await params;
  return (
    <PatientScheduleHistoryPage patientId={patientId} scheduleId={scheduleId} />
  );
}
