"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { PharmacyPrescriptionStatus } from "@/redux/types/pharmacy";
import { PHARMACY_RX_STATUS_LABELS } from "./pharmacyStatus";
import { PharmacyPrescriptionList } from "./PharmacyPrescriptionList";
import type { FilterField } from "@/types/tableLayout";

const ALL_STATUSES: (PharmacyPrescriptionStatus | "")[] = [
  "",
  "received",
  "reviewing",
  "preparing",
  "partially_dispensed",
  "dispensed",
  "unavailable",
  "rejected",
  "completed",
];

export function PharmacyPrescriptionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStatus = searchParams.get("status") || "";
  const [statusFilter, setStatusFilter] = useState(urlStatus);

  useEffect(() => {
    setStatusFilter(urlStatus);
  }, [urlStatus]);

  const pharmacy_status = statusFilter || undefined;

  const statusOptions = useMemo(
    () =>
      ALL_STATUSES.map((s) => ({
        label: s ? PHARMACY_RX_STATUS_LABELS[s as PharmacyPrescriptionStatus] : "All statuses",
        value: s,
      })),
    []
  );

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Prescription status",
      type: "multiselect",
      placeholder: "Filter by status",
      value: statusFilter,
      onChange: (value: string) => {
        setStatusFilter(value);
        if (value) {
          router.replace(`/pharmacy/prescriptions?status=${value}`);
        } else {
          router.replace("/pharmacy/prescriptions");
        }
      },
      options: [
        { label: "All statuses", value: "" },
        ...statusOptions
          .filter((o) => o.value !== "")
          .map((o) => ({ label: o.label, value: o.value })),
      ],
    },
  ];

  return (
    <PharmacyPrescriptionList
      title="Prescriptions"
      description="All prescriptions sent to your pharmacy. Filter by workflow status (received, preparing, completed, etc.)."
      pharmacy_status={pharmacy_status}
      filters={filters}
    />
  );
}
