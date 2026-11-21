"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ColumnDef } from "@tanstack/react-table";
import {
  FileText,
  Building2,
  Calendar,
  MapPin,
  Gem,
  Factory,
  Search,
  Filter,
  Layers,
  Map as MapIcon,
  List as ListIcon,
  Settings,
  ExternalLink,
  Plus,
  Eye,
  Edit,
  CheckCircle2,
} from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetLicensesQuery, useGetLicenseTypesQuery } from "@/redux/api/licenseApi";
import type { CompanyLicense } from "@/redux/types/license";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { LicenseTypeManagementModal } from "./LicenseTypeManagementModal";
import { EditLicenseModal } from "./EditLicenseModal";
import { LicenseProductionAssignModal } from "@/features/production/LicenseProductionAssignModal";

// Dynamic import for Leaflet Map
const LeafletMap = dynamic(() => import("@/components/gis/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
      <div className="text-center space-y-2">
        <Loading01 />
        <p className="text-xs text-slate-500">Loading GIS map view...</p>
      </div>
    </div>
  ),
});

const ETHIOPIAN_REGIONS = [
  "Afar",
  "Amhara",
  "Benishangul Gumuz",
  "Central Ethiopia",
  "Dire Dawa",
  "Gambella",
  "Oromia",
  "Sidama",
  "Somali",
  "South West Ethiopia",
  "Southern Ethiopia",
  "Tigray",
];

export function LicenseDirectoryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "map">("table");

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<CompanyLicense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productionLicense, setProductionLicense] = useState<CompanyLicense | null>(null);

  const { data: licenseTypes = [] } = useGetLicenseTypesQuery();
  const { data: licenses = [], isLoading, refetch } = useGetLicensesQuery({
    search: searchQuery || undefined,
  });

  const openEdit = (lic: CompanyLicense) => {
    setEditingLicense(lic);
    setIsEditModalOpen(true);
  };

  const openProduction = (lic: CompanyLicense) => {
    setProductionLicense(lic);
  };

  // Filter licenses by search, status, type, and region
  const filteredData = useMemo(() => {
    return licenses.filter((lic) => {
      if (statusFilter && lic.status !== statusFilter) return false;
      if (typeFilter && lic.license_type_id !== typeFilter) return false;
      if (regionFilter && lic.region !== regionFilter) return false;
      return true;
    });
  }, [licenses, statusFilter, typeFilter, regionFilter]);

  const miningCount = useMemo(
    () => licenses.filter((l) => (l.licenseType?.name || "").toLowerCase().includes("mining")).length,
    [licenses]
  );
  const explorationCount = useMemo(
    () => licenses.filter((l) => (l.licenseType?.name || "").toLowerCase().includes("exploration")).length,
    [licenses]
  );
  const activeCount = useMemo(
    () => licenses.filter((l) => l.status === "active").length,
    [licenses]
  );

  const columns = useMemo<ColumnDef<CompanyLicense>[]>(() => {
    return [
      {
        accessorKey: "license_number",
        header: "License Number",
        cell: ({ row }) => {
          const lic = row.original;
          const hasBoundary = !!(lic.boundary_geojson?.coordinates?.[0]?.length);
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground">
                <Link
                  href={`/admin/licenses/${lic.license_id}`}
                  className="hover:text-primary hover:underline"
                >
                  {lic.license_number}
                </Link>
                {hasBoundary && (
                  <span
                    title="GIS Polygon Loaded"
                    className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-mono px-1 py-0.2 rounded"
                  >
                    GIS
                  </span>
                )}
              </div>
              {lic.license_name && (
                <div className="text-xs text-muted-foreground truncate max-w-xs">
                  {lic.license_name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "company.name",
        header: "Company",
        cell: ({ row }) => {
          const comp = row.original.company;
          if (!comp) return <span className="text-muted-foreground text-xs">N/A</span>;
          return (
            <div className="space-y-0.5">
              <Link
                href={`/admin/companies/${comp.company_id}`}
                className="font-medium text-foreground hover:text-primary hover:underline text-sm flex items-center gap-1"
              >
                <span>{comp.name}</span>
                {comp.abbreviation && (
                  <span className="text-xs font-mono text-muted-foreground">({comp.abbreviation})</span>
                )}
              </Link>
              {comp.code && (
                <div className="text-xs text-muted-foreground font-mono">{comp.code}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "licenseType.name",
        header: "Type",
        cell: ({ row }) => {
          const name = row.original.licenseType?.name || "License";
          const isMining = name.toLowerCase().includes("mining");
          return (
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 font-semibold ${
                isMining
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
              }`}
            >
              {name}
            </Badge>
          );
        },
      },
      {
        accessorKey: "mineral_type",
        header: "Mineral",
        cell: ({ row }) => {
          const min = row.original.mineral_type;
          return (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Gem className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{min || "N/A"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "region",
        header: "Location",
        cell: ({ row }) => {
          const { region, zone, woreda } = row.original;
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>
                {[region, zone, woreda].filter(Boolean).join(" · ") || "N/A"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "effective_start_date",
        header: "Validity Window",
        cell: ({ row }) => {
          const { effective_start_date, effective_end_date } = row.original;
          return (
            <div className="text-xs font-mono">
              <div className="text-foreground">
                {effective_start_date || "2026-07-08"} &rarr; {effective_end_date || "2027-07-07"}
              </div>
              <div className="text-[10px] text-muted-foreground font-sans">
                EFY 2019
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "production_items_count",
        header: "Assigned Production",
        cell: ({ row }) => {
          const count = row.original.production_items_count ?? 0;
          return (
            <button
              onClick={() => openProduction(row.original)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
              title="Click to configure production reporting"
            >
              <Factory className="w-3.5 h-3.5 text-emerald-600" />
              <span>{count} {count === 1 ? "item" : "items"}</span>
            </button>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant={status === "active" ? "default" : "secondary"}
              className={`text-xs capitalize ${
                status === "active"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40"
                  : status === "expired"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40"
                  : ""
              }`}
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const lic = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/licenses/${lic.license_id}`)}
                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                title="View License & GIS Detail"
              >
                <Eye className="w-4 h-4 mr-1" />
                <span className="text-xs">Detail</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(lic)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Edit License Information"
              >
                <Edit className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => openProduction(lic)}
                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                title="Configure Production Reporting"
              >
                <Factory className="w-4 h-4" />
              </Button>
            </div>
          );
        },
      },
    ];
  }, [router]);

  const stats = useMemo(() => {
    return [
      {
        title: "Total Licenses",
        value: licenses.length,
        icon: FileText,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
      },
      {
        title: "Mining Concessions",
        value: miningCount,
        icon: Factory,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      },
      {
        title: "Exploration Licenses",
        value: explorationCount,
        icon: Layers,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
      },
      {
        title: "Active Licenses",
        value: activeCount,
        icon: CheckCircle2,
        color: "text-emerald-700",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      },
    ];
  }, [licenses.length, miningCount, explorationCount, activeCount]);

  const filterFields = useMemo<FilterField[]>(() => {
    return [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Expired", value: "expired" },
          { label: "Suspended", value: "suspended" },
          { label: "Under Review", value: "under_review" },
          { label: "Terminated", value: "terminated" },
        ],
        value: statusFilter,
        onChange: (val) => setStatusFilter(String(val || "")),
      },
      {
        key: "type",
        label: "License Type",
        type: "select",
        options: licenseTypes.map((t) => ({ label: t.name, value: t.license_type_id })),
        value: typeFilter,
        onChange: (val) => setTypeFilter(String(val || "")),
      },
      {
        key: "region",
        label: "Region",
        type: "select",
        options: ETHIOPIAN_REGIONS.map((r) => ({ label: r, value: r })),
        value: regionFilter,
        onChange: (val) => setRegionFilter(String(val || "")),
      },
    ];
  }, [statusFilter, typeFilter, regionFilter, licenseTypes]);

  const actionButtons = useMemo<ActionButton[]>(() => {
    return [
      {
        label: viewMode === "table" ? "GIS Map View" : "Table View",
        icon: viewMode === "table" ? <MapIcon className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />,
        variant: "outline",
        onClick: () => setViewMode((prev) => (prev === "table" ? "map" : "table")),
      },
      {
        label: "License Types",
        icon: <Settings className="h-4 w-4" />,
        variant: "outline",
        onClick: () => setIsTypeModalOpen(true),
      },
    ];
  }, [viewMode]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.title} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">{s.title}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
            <div className={`p-2.5 rounded-lg ${s.bgColor}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      <TableLayout
        title="Mining & Exploration Licenses"
        description="Comprehensive directory of registered mining licenses, active exploration concessions, mineral types, and GIS boundaries."
        filters={filterFields}
        actions={actionButtons}
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <Loading01 />
          </div>
        ) : viewMode === "map" ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-border p-2 shadow-sm">
            <LeafletMap licenses={filteredData} height="650px" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredData}
            isLoading={isLoading}
          />
        )}
      </TableLayout>

      {/* Edit License Modal */}
      {editingLicense && (
        <EditLicenseModal
          license={editingLicense}
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setEditingLicense(null);
          }}
          onSuccess={() => refetch()}
        />
      )}

      {/* Production Assignment Modal */}
      {productionLicense && (
        <LicenseProductionAssignModal
          license={productionLicense}
          companyId={productionLicense.company_id}
          open={Boolean(productionLicense)}
          onOpenChange={(open) => {
            if (!open) setProductionLicense(null);
          }}
          onSuccess={() => refetch()}
        />
      )}

      {/* License Type Administration Modal */}
      <LicenseTypeManagementModal
        open={isTypeModalOpen}
        onOpenChange={setIsTypeModalOpen}
      />
    </div>
  );
}
