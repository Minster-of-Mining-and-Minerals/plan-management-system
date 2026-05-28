import type { StaffAppointmentStatus } from "@/redux/api/appointmentApi";

export const APPOINTMENT_STATUS_LABELS: Record<StaffAppointmentStatus, string> = {
  admitted: "Admitted",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const APPOINTMENT_STATUS_VARIANT: Record<
  StaffAppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  admitted: "default",
  completed: "secondary",
  cancelled: "destructive",
};
