"use client";

import { useCallback, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetPharmacyPortalPrescriptionsQuery,
  useLazyGetPharmacyPortalPrescriptionQuery,
} from "@/redux/api/pharmacyPortalApi";
import { printPharmacyPrescriptionDocument } from "./pharmacyPrescriptionPrint";
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
  const [fetchPrescription] = useLazyGetPharmacyPortalPrescriptionQuery();
  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrint = useCallback(
    async (pharmacyPrescriptionId: string) => {
      setPrintingId(pharmacyPrescriptionId);
      try {
        const rx = await fetchPrescription(pharmacyPrescriptionId).unwrap();
        printPharmacyPrescriptionDocument(rx);
      } catch {
        toast.error("Could not load prescription for printing");
      } finally {
        setPrintingId(null);
      }
    },
    [fetchPrescription]
  );

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
        cell: ({ row }) => {
          const id = row.original.pharmacy_prescription_id;
          const isPrinting = printingId === id;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                title="Print prescription"
                disabled={isPrinting}
                onClick={() => handlePrint(id)}
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="View details"
                onClick={() => router.push(`/pharmacy/prescriptions/${id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [router, printingId, handlePrint]
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
