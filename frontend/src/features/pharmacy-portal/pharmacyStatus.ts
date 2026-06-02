import type { PharmacyPrescriptionStatus } from "@/redux/types/pharmacy";

export const PHARMACY_RX_STATUS_LABELS: Record<PharmacyPrescriptionStatus, string> = {
  received: "Received",
  reviewing: "Reviewing",
  preparing: "Preparing",
  partially_dispensed: "Partially dispensed",
  dispensed: "Dispensed",
  unavailable: "Unavailable",
  rejected: "Rejected",
  completed: "Completed",
};

export const PHARMACY_RX_STATUS_STYLES: Record<
  PharmacyPrescriptionStatus,
  { bg: string; text: string; border: string }
> = {
  received: {
    bg: "bg-blue-500/15",
    text: "text-blue-800 dark:text-blue-200",
    border: "border-blue-500/40",
  },
  reviewing: {
    bg: "bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-200",
    border: "border-amber-500/40",
  },
  preparing: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-800 dark:text-cyan-200",
    border: "border-cyan-500/40",
  },
  partially_dispensed: {
    bg: "bg-violet-500/15",
    text: "text-violet-800 dark:text-violet-200",
    border: "border-violet-500/40",
  },
  dispensed: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-500/40",
  },
  unavailable: {
    bg: "bg-red-500/15",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-500/40",
  },
  rejected: {
    bg: "bg-red-500/15",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-500/40",
  },
  completed: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-500/40",
  },
};
