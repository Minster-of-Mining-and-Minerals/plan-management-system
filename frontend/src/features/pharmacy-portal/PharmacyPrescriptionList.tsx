"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetPharmacyPortalPrescriptionsQuery } from "@/redux/api/pharmacyPortalApi";
import type { PharmacyPrescription } from "@/redux/types/pharmacy";
import {
  PHARMACY_RX_STATUS_LABELS,
  PHARMACY_RX_STATUS_STYLES,
} from "./pharmacyStatus";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import type { FilterField } from "@/types/tableLayout";

type Props = {
  title: string;
  description: string;
  pharmacy_status?: string;
  filters?: FilterField[];
};

export function PharmacyPrescriptionList({
  title,
  description,
  pharmacy_status,
  filters = [],
}: Props) {
  const router = useRouter();
  const { data = [], isLoading } = useGetPharmacyPortalPrescriptionsQuery({
    pharmacy_status,
  });

  const columns: ColumnDef<PharmacyPrescription>[] = useMemo(
    () => [
      {
        id: "prescription",
        header: "Prescription",
        cell: ({ row }) => row.original.source_header_title || "Prescription",
      },
      {
        id: "patient",
        header: "Patient",
        cell: ({ row }) => row.original.patient_name || "—",
      },
      {
        id: "doctor",
        header: "Doctor",
        cell: ({ row }) => row.original.prescriber_name || "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.pharmacy_status;
          const styles = PHARMACY_RX_STATUS_STYLES[status];
          return (
            <Badge
              variant="outline"
              className={cn("capitalize", styles.bg, styles.text, styles.border)}
            >
              {PHARMACY_RX_STATUS_LABELS[status]}
            </Badge>
          );
        },
      },
      {
        id: "date",
        header: "Received",
        cell: ({ row }) =>
          row.original.received_at
            ? new Date(row.original.received_at).toLocaleString()
            : "—",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(
                `/pharmacy/prescriptions/${row.original.pharmacy_prescription_id}`
              )
            }
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  );

  const {
    paginated: paginatedData,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
  } = useClientDataTable(data, {
    searchKeys: ["patient_name", "prescriber_name", "source_header_title"],
  });

  if (isLoading) return <Loading01 />;

  return (
    <TableLayout
      title={title}
      description={description}
      filters={filters}
      filterColumnsPerRow={1}
    >
      <DataTable
        columns={columns}
        data={paginatedData}
        totalPageCount={totalPageCount}
        handlePagination={handlePagination}
        tablePageSize={pageSize}
        currentIndex={pageIndex}
        isLoading={isLoading}
      />
    </TableLayout>
  );
}
