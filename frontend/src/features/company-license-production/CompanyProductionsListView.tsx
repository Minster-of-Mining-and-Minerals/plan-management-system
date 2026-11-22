"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Factory,
  FileBadge,
  Calendar,
  Gem,
  ExternalLink,
  Eye,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useGetAssignmentsQuery, useGetReportsQuery } from "@/redux/api/productionApi";
import type { CompanyProductionAssignment } from "@/redux/types/production";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { FilterField } from "@/types/tableLayout";

export function CompanyProductionsListView({ overrideCompanyId }: { overrideCompanyId?: string }) {
  const params = useParams<{ id: string }>();
  const companyId = overrideCompanyId || params?.id;

  const { data: assignments = [], isLoading: isAssignmentsLoading } = useGetAssignmentsQuery(
    companyId ? { company_id: companyId } : undefined,
    { skip: !companyId }
  );

  const { data: reportsData } = useGetReportsQuery(
    companyId ? { company_id: companyId, limit: 100 } : undefined,
    { skip: !companyId }
  );

  const [licenseFilter, setLicenseFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");

  const reportsList = reportsData?.reports || [];

  // Map last reporting date by assignment
  const lastReportDateByAssignment = useMemo(() => {
    const dates: Record<string, string> = {};
    for (const r of reportsList) {
      if (r.assignment_id) {
        if (!dates[r.assignment_id] || new Date(r.report_date) > new Date(dates[r.assignment_id])) {
          dates[r.assignment_id] = r.report_date;
        }
      }
    }
    return dates;
  }, [reportsList]);

  const columns = useMemo<ColumnDef<CompanyProductionAssignment>[]>(
    () => [
      {
        accessorKey: "productionItem.name",
        header: "Production Item",
        cell: ({ row }) => {
          const assign = row.original;
          return (
            <div className="space-y-0.5">
              <Link
                href={`/companies/${companyId}/productions/${assign.assignment_id}`}
                className="font-semibold text-primary hover:underline flex items-center gap-1.5"
              >
                <Factory className="h-4 w-4 text-primary shrink-0" />
                <span>{assign.productionItem?.name || "Mineral Production"}</span>
              </Link>
              {assign.productionItem?.code && (
                <div className="text-[11px] font-mono text-muted-foreground ml-5">
                  Code: {assign.productionItem.code}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "license_info",
        header: "Associated License",
        cell: ({ row }) => {
          const lic = row.original.license;
          if (!lic) {
            return <span className="text-xs text-muted-foreground italic">No License</span>;
          }
          return (
            <div className="space-y-0.5">
              <Link
                href={`/companies/${companyId}/licenses/${lic.license_id}`}
                className="font-mono text-xs font-semibold text-foreground hover:underline flex items-center gap-1"
              >
                <FileBadge className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{lic.license_number}</span>
              </Link>
              <div className="text-[11px] text-muted-foreground">
                {lic.licenseType?.name || "License"} &bull; {lic.status?.toUpperCase() || "ACTIVE"}
              </div>
            </div>
          );
        },
      },
      {
        id: "mineral_type",
        header: "Mineral Type",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Gem className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>{row.original.license?.mineral_type || row.original.productionItem?.category || "Mineral"}</span>
          </div>
        ),
      },
      {
        id: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-medium">
            {row.original.defaultReportingUnit?.name || "Standard Unit"} (
            {row.original.defaultReportingUnit?.symbol || "unit"})
          </span>
        ),
      },
      {
        id: "reporting_frequency",
        header: "Frequency",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {row.original.reportingFrequency?.name || "Monthly"}
          </Badge>
        ),
      },
      {
        accessorKey: "target_allocation_depth",
        header: "Allocation Depth",
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs font-mono uppercase">
            {row.original.target_allocation_depth || "Quarterly"}
          </Badge>
        ),
      },
      {
        id: "target_status",
        header: "Target Status",
        cell: ({ row }) => {
          const targets = row.original.targets || [];
          const latestTarget = [...targets].sort((a, b) => b.version_number - a.version_number)[0];
          const status = latestTarget ? latestTarget.status : "not_proposed";

          const badgeClasses: Record<string, string> = {
            approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
            published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
            submitted: "bg-blue-500/10 text-blue-600 border-blue-500/30",
            under_review: "bg-blue-500/10 text-blue-600 border-blue-500/30",
            revision_requested: "bg-amber-500/10 text-amber-600 border-amber-500/30",
            rejected: "bg-destructive/10 text-destructive border-destructive/30",
            draft: "bg-muted text-muted-foreground",
            not_proposed: "bg-muted text-muted-foreground",
          };

          return (
            <Badge variant="outline" className={`text-xs capitalize ${badgeClasses[status] || ""}`}>
              {status.replace("_", " ")}
            </Badge>
          );
        },
      },
      {
        id: "reporting_status",
        header: "Reporting Status",
        cell: ({ row }) => {
          const targets = row.original.targets || [];
          const hasApprovedTarget = targets.some((t) => t.status === "approved" || t.status === "published");
          const licStatus = (row.original.license?.status || "active").toLowerCase();
          const licActive = !row.original.license || (licStatus !== "suspended" && licStatus !== "terminated" && licStatus !== "inactive");
          const isEnabled = hasApprovedTarget && licActive;

          return (
            <Badge
              variant="outline"
              className={
                isEnabled
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold"
                  : "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
              }
            >
              {isEnabled ? "ENABLED" : "LOCKED"}
            </Badge>
          );
        },
      },
      {
        id: "assigned_responsibility",
        header: "Assigned To",
        cell: ({ row }) => {
          const responsibilities = row.original.responsibilities || [];
          if (responsibilities.length === 0) {
            return <span className="text-xs text-muted-foreground italic">Company HQ</span>;
          }
          const first = responsibilities[0];
          const name = first.department?.name || first.user?.full_name || first.role?.name || "Assigned Unit";
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium truncate max-w-[130px]">{name}</span>
              {responsibilities.length > 1 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  +{responsibilities.length - 1}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "last_report_date",
        header: "Last Report Date",
        cell: ({ row }) => {
          const date = lastReportDateByAssignment[row.original.assignment_id];
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {date || "No Reports"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            asChild
          >
            <Link href={`/companies/${companyId}/productions/${row.original.assignment_id}`}>
              <Eye className="h-3.5 w-3.5" />
              Detail
            </Link>
          </Button>
        ),
      },
    ],
    [companyId, lastReportDateByAssignment]
  );

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (licenseFilter !== "all" && a.license?.license_number !== licenseFilter) return false;
      if (itemFilter !== "all" && a.productionItem?.name !== itemFilter) return false;
      if (frequencyFilter !== "all" && a.reportingFrequency?.name !== frequencyFilter) return false;
      return true;
    });
  }, [assignments, licenseFilter, itemFilter, frequencyFilter]);

  const filters = useMemo<FilterField[]>(() => {
    const licenses = Array.from(
      new Set(assignments.map((a) => a.license?.license_number).filter(Boolean))
    );
    const items = Array.from(
      new Set(assignments.map((a) => a.productionItem?.name).filter(Boolean))
    );
    const frequencies = Array.from(
      new Set(assignments.map((a) => a.reportingFrequency?.name).filter(Boolean))
    );

    return [
      {
        key: "license",
        label: "License",
        type: "select" as const,
        placeholder: "All Licenses",
        value: licenseFilter,
        onChange: setLicenseFilter,
        options: [
          { label: "All Licenses", value: "all" },
          ...licenses.map((l) => ({ label: String(l), value: String(l) })),
        ],
      },
      {
        key: "item",
        label: "Production Item",
        type: "select" as const,
        placeholder: "All Items",
        value: itemFilter,
        onChange: setItemFilter,
        options: [
          { label: "All Items", value: "all" },
          ...items.map((i) => ({ label: String(i), value: String(i) })),
        ],
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "select" as const,
        placeholder: "All Frequencies",
        value: frequencyFilter,
        onChange: setFrequencyFilter,
        options: [
          { label: "All Frequencies", value: "all" },
          ...frequencies.map((f) => ({ label: String(f), value: String(f) })),
        ],
      },
    ];
  }, [assignments, licenseFilter, itemFilter, frequencyFilter]);

  if (isAssignmentsLoading) {
    return <Loading01 />;
  }

  const activeReportsCount = assignments.filter((a) => {
    const targets = a.targets || [];
    return targets.some((t) => t.status === "approved" || t.status === "published");
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-border/70 bg-gradient-to-r from-card to-muted/20 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Factory className="h-4 w-4" />
              Production Configuration & Reporting
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              License Production Assignments
            </h1>
            <p className="text-sm text-muted-foreground">
              Production obligations centrally assigned by the Federal Ministry across your mining and exploration licenses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href={`/companies/${companyId}/licenses`}>
                <FileBadge className="h-4 w-4 mr-1.5" />
                View Concession Licenses
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
              Assigned Productions
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Across all concessions</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-emerald-600 uppercase">
              Reporting Enabled
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{activeReportsCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Approved & active licenses</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-amber-600 uppercase">
              Reporting Locked
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">
              {assignments.length - activeReportsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Pending target approval</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase">
              Cumulative Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{reportsList.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Actual submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <TableLayout
        title="Assigned Production Requirements"
        description="Filter and manage production items assigned to company licenses. Select an item to propose targets, view analytics, or submit reports."
        filters={filters}
      >
        <DataTable
          columns={columns}
          data={filteredAssignments}
          isLoading={isAssignmentsLoading}
        />
      </TableLayout>
    </div>
  );
}
