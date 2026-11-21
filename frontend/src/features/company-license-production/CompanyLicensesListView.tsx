"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  FileBadge,
  Calendar,
  MapPin,
  Factory,
  ExternalLink,
  Layers,
  Gem,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useGetCompanyLicensesQuery } from "@/redux/api/licenseApi";
import { useGetAssignmentsQuery } from "@/redux/api/productionApi";
import type { CompanyLicense } from "@/redux/types/license";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { FilterField } from "@/types/tableLayout";

export function CompanyLicensesListView({ overrideCompanyId }: { overrideCompanyId?: string }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = overrideCompanyId || params?.id;

  const { data: licenses = [], isLoading: isLicensesLoading } = useGetCompanyLicensesQuery(
    companyId || "",
    { skip: !companyId }
  );

  const { data: assignments = [] } = useGetAssignmentsQuery(
    companyId ? { company_id: companyId } : undefined,
    { skip: !companyId }
  );

  const [mineralFilter, setMineralFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const companyLicenses = useMemo(() => {
    return licenses.filter((l) => l.company_id === companyId);
  }, [licenses, companyId]);

  const filteredLicenses = useMemo(() => {
    return companyLicenses.filter((lic) => {
      if (mineralFilter !== "all" && lic.mineral_type !== mineralFilter) return false;
      if (statusFilter !== "all" && lic.status !== statusFilter) return false;
      return true;
    });
  }, [companyLicenses, mineralFilter, statusFilter]);

  // Count assigned production items per license
  const productionCountByLicense = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments) {
      if (a.license_id) {
        counts[a.license_id] = (counts[a.license_id] || 0) + 1;
      }
    }
    return counts;
  }, [assignments]);

  const columns = useMemo<ColumnDef<CompanyLicense>[]>(
    () => [
      {
        accessorKey: "license_number",
        header: "License Number",
        cell: ({ row }) => {
          const lic = row.original;
          return (
            <div className="space-y-0.5">
              <Link
                href={`/companies/${companyId}/licenses/${lic.license_id}`}
                className="font-semibold text-primary hover:underline flex items-center gap-1.5"
              >
                <FileBadge className="h-4 w-4 text-primary shrink-0" />
                <span>{lic.license_number}</span>
              </Link>
              {lic.license_name && (
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {lic.license_name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "license_type",
        header: "License Type",
        cell: ({ row }) => {
          const typeName = row.original.licenseType?.name || "Mining";
          const isMining = typeName.toLowerCase().includes("mining");
          return (
            <Badge
              variant="outline"
              className={
                isMining
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              }
            >
              {typeName}
            </Badge>
          );
        },
      },
      {
        accessorKey: "mineral_type",
        header: "Mineral Type",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Gem className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="font-medium">{row.original.mineral_type || "N/A"}</span>
          </div>
        ),
      },
      {
        id: "location",
        header: "Administrative Location",
        cell: ({ row }) => {
          const lic = row.original;
          const locParts = [lic.region, lic.zone, lic.woreda].filter(Boolean);
          return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{locParts.length > 0 ? locParts.join(" / ") : "Unspecified"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "issued_date",
        header: "Issued Date",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.issued_date || "—"}
          </span>
        ),
      },
      {
        id: "validity",
        header: "Effective Period",
        cell: ({ row }) => {
          const lic = row.original;
          return (
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-1 font-mono">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>
                  {lic.effective_start_date || "—"} &rarr; {lic.effective_end_date || "—"}
                </span>
              </div>
              {(lic.effective_year_from || lic.effective_year_to) && (
                <div className="text-[11px] text-muted-foreground">
                  Years: {lic.effective_year_from || "—"} to {lic.effective_year_to || "—"}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status || "active";
          const isActive = status.toLowerCase() === "active";
          return (
            <Badge
              variant="outline"
              className={
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/30"
              }
            >
              {status.toUpperCase()}
            </Badge>
          );
        },
      },
      {
        id: "productions_count",
        header: "Attached Productions",
        cell: ({ row }) => {
          const count = productionCountByLicense[row.original.license_id] || 0;
          return (
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <Factory className="h-3 w-3" />
              <span>{count} Items</span>
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            asChild
          >
            <Link href={`/companies/${companyId}/licenses/${row.original.license_id}`}>
              <Eye className="h-3.5 w-3.5" />
              View Detail
            </Link>
          </Button>
        ),
      },
    ],
    [companyId, productionCountByLicense]
  );

  const filters = useMemo<FilterField[]>(() => {
    const minerals = Array.from(new Set(companyLicenses.map((l) => l.mineral_type).filter(Boolean)));
    const statuses = Array.from(new Set(companyLicenses.map((l) => l.status).filter(Boolean)));

    return [
      {
        key: "mineral_type",
        label: "Mineral Type",
        type: "select" as const,
        placeholder: "All Minerals",
        value: mineralFilter,
        onChange: setMineralFilter,
        options: [
          { label: "All Minerals", value: "all" },
          ...minerals.map((m) => ({ label: String(m), value: String(m) })),
        ],
      },
      {
        key: "status",
        label: "License Status",
        type: "select" as const,
        placeholder: "All Statuses",
        value: statusFilter,
        onChange: setStatusFilter,
        options: [
          { label: "All Statuses", value: "all" },
          ...statuses.map((s) => ({ label: String(s).toUpperCase(), value: String(s) })),
        ],
      },
    ];
  }, [companyLicenses, mineralFilter, statusFilter]);

  if (isLicensesLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-xl border border-border/70 bg-gradient-to-r from-card to-muted/20 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <FileBadge className="h-4 w-4" />
              License Management
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Company Concessions & Mining Licenses
            </h1>
            <p className="text-sm text-muted-foreground">
              Review mineral licenses, valid concession periods, GIS spatial boundaries, and attached production reporting configurations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href={`/companies/${companyId}/productions`}>
                <Factory className="h-4 w-4 mr-1.5" />
                View Assigned Productions
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Total Concessions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{companyLicenses.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Assigned to company domain</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-emerald-600 uppercase">
              Active Licenses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">
              {companyLicenses.filter((l) => (l.status || "").toLowerCase() === "active").length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Eligible for production</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-indigo-600 uppercase">
              Distinct Minerals
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-indigo-600">
              {new Set(companyLicenses.map((l) => l.mineral_type).filter(Boolean)).size}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Minerals licensed</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase">
              Attached Productions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Configured reporting items</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <TableLayout
        title="Assigned Mining & Exploration Licenses"
        description="Comprehensive list of official licenses registered for this company."
        filters={filters}
      >
        <DataTable
          columns={columns}
          data={filteredLicenses}
          isLoading={isLicensesLoading}
        />
      </TableLayout>
    </div>
  );
}
