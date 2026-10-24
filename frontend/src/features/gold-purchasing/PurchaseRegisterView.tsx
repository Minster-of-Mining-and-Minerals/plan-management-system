"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Coins,
  PlusCircle,
  Eye,
  Building2,
  HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetGoldPurchasesQuery } from "@/redux/api/goldApi";
import { GoldOperationsTabsHeader } from "./GoldOperationsTabsHeader";
import type { GoldPurchase } from "@/redux/types/gold";

interface PurchaseRegisterViewProps {
  centerId?: string;
  isFederalOversight?: boolean;
}

export function PurchaseRegisterView({
  centerId,
  isFederalOversight = false,
}: PurchaseRegisterViewProps) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const activeCenterId = centerId || params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/admin/gold-operations";

  const { can } = usePermissions();

  const [sellerType, setSellerType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data, isLoading, isError, refetch } = useGetGoldPurchasesQuery({
    purchasing_center_id: isFederalOversight ? undefined : activeCenterId,
    seller_type: sellerType !== "all" ? sellerType : undefined,
    status: status !== "all" ? status : undefined,
    search: searchQuery.trim() || undefined,
    page,
    limit,
  });

  const purchases = data?.items || [];
  const pagination = data?.pagination;

  const columns: ColumnDef<GoldPurchase>[] = [
    {
      accessorKey: "purchase_reference",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-foreground whitespace-nowrap text-xs">
          {row.original.purchase_reference}
        </span>
      ),
    },
    {
      accessorKey: "business_date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap text-xs">
          {row.original.business_date}
        </span>
      ),
    },
    ...(isFederalOversight
      ? [
          {
            id: "center",
            header: "Center",
            cell: ({ row }: { row: { original: GoldPurchase } }) => (
              <span className="text-foreground font-medium text-xs">
                {row.original.purchasingCenter?.name || "Purchasing Center"}
              </span>
            ),
          } as ColumnDef<GoldPurchase>,
        ]
      : []),
    {
      accessorKey: "seller_type",
      header: "Seller Type",
      cell: ({ row }) => {
        const isCompany = row.original.seller_type === "company";
        return (
          <Badge
            variant="outline"
            className={
              isCompany
                ? "text-sky-600 dark:text-sky-400 border-sky-400/30 text-[11px] gap-1"
                : "text-amber-600 dark:text-amber-400 border-amber-400/30 text-[11px] gap-1"
            }
          >
            {isCompany ? (
              <>
                <Building2 className="h-3 w-3" /> Company
              </>
            ) : (
              <>
                <HardHat className="h-3 w-3" /> ASM
              </>
            )}
          </Badge>
        );
      },
    },
    {
      id: "sellerName",
      header: "Seller Name & Identifier",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="space-y-0.5">
            <p className="font-medium text-foreground text-xs">{p.seller_name_snapshot}</p>
            {p.seller_identifier_snapshot && (
              <p className="text-[11px] font-mono text-muted-foreground">
                {p.seller_identifier_snapshot}
              </p>
            )}
            {p.karat && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {p.karat} {p.quality_grade ? `• ${p.quality_grade}` : ""}
                </span>
                {p.is_custom_price && (
                  <Badge variant="secondary" className="text-[9px] py-0 px-1">
                    Custom Override
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "quantity",
      header: "Recorded Qty",
      cell: ({ row }) => (
        <span className="font-mono font-medium whitespace-nowrap text-xs">
          {parseFloat(String(row.original.quantity)).toLocaleString()}{" "}
          <span className="text-muted-foreground">{row.original.unit_code_snapshot}</span>
        </span>
      ),
    },
    {
      id: "quantity_canonical",
      header: "Canonical (g)",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-muted-foreground whitespace-nowrap text-xs">
          {parseFloat(String(row.original.quantity_in_canonical_unit)).toLocaleString()} g
        </span>
      ),
    },
    {
      id: "unit_price",
      header: "Unit Price",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {parseFloat(String(row.original.unit_price)).toLocaleString()} ETB
        </span>
      ),
    },
    {
      id: "total_amount",
      header: "Total Value",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-foreground whitespace-nowrap text-xs">
          {parseFloat(String(row.original.total_amount)).toLocaleString()} ETB
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isCompleted = row.original.status === "completed";
        return (
          <Badge
            variant={isCompleted ? "default" : "destructive"}
            className={
              isCompleted
                ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                : "text-[11px]"
            }
          >
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const detailsUrl = isFederalOversight
          ? `/admin/gold-operations/purchases/${row.original.purchase_id}`
          : `${basePath}/purchases/${row.original.purchase_id}`;
        return (
          <div className="text-right">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">
              <Link href={detailsUrl}>
                <Eye className="h-3.5 w-3.5" />
                Details
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  const filters: FilterField[] = [
    {
      key: "seller_type",
      label: "Seller Type",
      type: "select",
      placeholder: "All Seller Types",
      value: sellerType,
      onChange: (val: string) => {
        setSellerType(val);
        setPage(1);
      },
      options: [
        { label: "All Seller Types", value: "all" },
        { label: "Registered Companies", value: "company" },
        { label: "ASM Miners", value: "asm" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All Statuses",
      value: status,
      onChange: (val: string) => {
        setStatus(val);
        setPage(1);
      },
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
  ];

  const actions: ActionButton[] =
    !isFederalOversight && can("GOLD_PURCHASES:CREATE")
      ? [
          {
            label: "Record Gold Purchase",
            icon: <PlusCircle className="h-4 w-4" />,
            variant: "default",
            onClick: () => router.push(`${basePath}/purchases/new`),
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      {isFederalOversight && <GoldOperationsTabsHeader />}

      <TableLayout
        title="Gold Purchase Register"
        description={
          isFederalOversight
            ? "Centralized register of gold purchases recorded across all purchasing centers."
            : "Complete ledger of individual gold purchase transactions recorded by this purchasing center."
        }
        actions={actions}
        filters={filters}
        filterColumnsPerRow={2}
      >
        <DataTable
          columns={columns}
          data={purchases}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load gold purchase records."
          onRetry={refetch}
          paginationMode="server"
          totalRowCount={pagination?.total || 0}
          pageIndex={page - 1}
          pageSize={limit}
          onPaginationChange={(newPageIndex, newPageSize) => {
            setPage(newPageIndex + 1);
            if (newPageSize !== limit) {
              setLimit(newPageSize);
            }
          }}
          resetKey={`${searchQuery}-${sellerType}-${status}`}
        />
      </TableLayout>
    </div>
  );
}
