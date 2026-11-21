"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  FileText,
  Plus,
  Calendar,
  MapPin,
  Factory,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle2,
  Layers,
  Gem,
  Eye,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetCompanyLicensesQuery,
  useGetLicenseTypesQuery,
  useCreateLicenseMutation,
} from "@/redux/api/licenseApi";
import type { CompanyLicense, CreateLicensePayload } from "@/redux/types/license";
import { actionFeedback } from "@/components/action-feedback";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { LicenseProductionAssignModal } from "@/features/production/LicenseProductionAssignModal";
import { EditLicenseModal } from "@/features/license-management/EditLicenseModal";
import { ShapefileCoordinatePicker } from "@/components/gis/ShapefileCoordinatePicker";
import type { FilterField, ActionButton } from "@/types/tableLayout";

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

interface CompanyLicenseListProps {
  companyId: string;
  companyName: string;
  onViewOnMap?: (license: CompanyLicense) => void;
}

export function CompanyLicenseList({
  companyId,
  companyName,
  onViewOnMap,
}: CompanyLicenseListProps) {
  const router = useRouter();
  const { data: licenses = [], isLoading, refetch } = useGetCompanyLicensesQuery(companyId);
  const { data: licenseTypes = [] } = useGetLicenseTypesQuery();
  const [createLicense, { isLoading: isCreating }] = useCreateLicenseMutation();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<CompanyLicense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLicenseForProduction, setSelectedLicenseForProduction] = useState<CompanyLicense | null>(null);

  // Form State for Issue License
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formMineral, setFormMineral] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formZone, setFormZone] = useState("");
  const [formWoreda, setFormWoreda] = useState("");
  const [formIssuedDate, setFormIssuedDate] = useState("");
  const [formEffectiveStart, setFormEffectiveStart] = useState("2026-07-08");
  const [formEffectiveEnd, setFormEffectiveEnd] = useState("2027-07-07");
  const [formDescription, setFormDescription] = useState("");
  const [formBoundary, setFormBoundary] = useState<any>(null);
  const [formCentroidLat, setFormCentroidLat] = useState<number | null>(null);
  const [formCentroidLon, setFormCentroidLon] = useState<number | null>(null);

  const resetForm = () => {
    setFormNumber("");
    setFormName("");
    setFormTypeId("");
    setFormMineral("");
    setFormRegion("");
    setFormZone("");
    setFormWoreda("");
    setFormIssuedDate("");
    setFormEffectiveStart("2026-07-08");
    setFormEffectiveEnd("2027-07-07");
    setFormDescription("");
    setFormBoundary(null);
    setFormCentroidLat(null);
    setFormCentroidLon(null);
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      actionFeedback.error("License Number is required");
      return;
    }
    if (!formTypeId) {
      actionFeedback.error("Please select a License Type");
      return;
    }

    try {
      const payload: CreateLicensePayload = {
        company_id: companyId,
        license_type_id: formTypeId,
        license_number: formNumber.trim(),
        license_name: formName.trim() || undefined,
        mineral_type: formMineral.trim() || undefined,
        region: formRegion.trim() || undefined,
        zone: formZone.trim() || undefined,
        woreda: formWoreda.trim() || undefined,
        issued_date: formIssuedDate || undefined,
        effective_start_date: formEffectiveStart || "2026-07-08",
        effective_end_date: formEffectiveEnd || "2027-07-07",
        description: formDescription.trim() || undefined,
        boundary_geojson: formBoundary,
        latitude: formCentroidLat !== null ? formCentroidLat : undefined,
        longitude: formCentroidLon !== null ? formCentroidLon : undefined,
      };

      await createLicense(payload).unwrap();
      actionFeedback.success(`License ${formNumber} issued successfully to ${companyName}.`);
      setIsIssueModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to issue license.");
    }
  };

  const filteredLicenses = useMemo(() => {
    return licenses.filter((lic) => {
      if (statusFilter && lic.status !== statusFilter) return false;
      if (typeFilter && lic.license_type_id !== typeFilter) return false;
      return true;
    });
  }, [licenses, statusFilter, typeFilter]);

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
                    title="GIS coordinates loaded"
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
        header: "Validity Range",
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
        header: "Production Reporting",
        cell: ({ row }) => {
          const count = row.original.production_items_count ?? 0;
          return (
            <button
              onClick={() => setSelectedLicenseForProduction(row.original)}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
              title="Configure production reporting"
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
                title="View Full License & GIS Coordinates"
              >
                <Eye className="w-4 h-4 mr-1" />
                <span className="text-xs">Detail</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingLicense(lic);
                  setIsEditModalOpen(true);
                }}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Edit License Information"
              >
                <Edit className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLicenseForProduction(lic)}
                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                title="Configure Production Reporting"
              >
                <Factory className="w-4 h-4" />
              </Button>

              {onViewOnMap && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewOnMap(lic)}
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="View Boundary on GIS Map"
                >
                  <MapIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [router, onViewOnMap]);

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
        title: "Active Licenses",
        value: licenses.filter((l) => l.status === "active").length,
        icon: CheckCircle2,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      },
      {
        title: "Mining Concessions",
        value: licenses.filter((l) => (l.licenseType?.name || "").toLowerCase().includes("mining")).length,
        icon: Factory,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
      },
    ];
  }, [licenses]);

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
    ];
  }, [statusFilter, typeFilter, licenseTypes]);

  const actionButtons = useMemo<ActionButton[]>(() => {
    return [
      {
        label: "Issue New License",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: () => {
          resetForm();
          setIsIssueModalOpen(true);
        },
      },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        title={`${companyName} — Licenses`}
        description="Mining and exploration concessions issued to this company, location coordinates, and active production assignments."
        filters={filterFields}
        actions={actionButtons}
      >
        {isLoading ? (
          <div className="p-8 text-center">
            <Loading01 />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredLicenses}
            isLoading={isLoading}
          />
        )}
      </TableLayout>

      {/* Issue License Modal with Shapefile Upload & GIS Coordinate Picker */}
      <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue New License for {companyName}</DialogTitle>
            <DialogDescription>
              Register a mining or exploration license with administrative location and shapefile coordinates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLicense} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lic-no" className="text-xs font-semibold">
                  License Number *
                </Label>
                <Input
                  id="lic-no"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="e.g. MOM/EL/00140/2026"
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">License Type *</Label>
                <Select value={formTypeId} onValueChange={setFormTypeId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select License Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseTypes.map((t) => (
                      <SelectItem key={t.license_type_id} value={t.license_type_id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lic-name" className="text-xs font-semibold">
                  Concession / Project Name
                </Label>
                <Input
                  id="lic-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Konba Gold Exploration Site"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lic-mineral" className="text-xs font-semibold">
                  Mineral Type
                </Label>
                <Input
                  id="lic-mineral"
                  value={formMineral}
                  onChange={(e) => setFormMineral(e.target.value)}
                  placeholder="e.g. Primary Gold, Limestone, Opal"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Validity Window (Default 2026-07-08 to 2027-07-07) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Validity Window (Ethiopian Fiscal Year 2019)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="lic-issued" className="text-[11px]">
                    Issued Date
                  </Label>
                  <Input
                    id="lic-issued"
                    type="date"
                    value={formIssuedDate}
                    onChange={(e) => setFormIssuedDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lic-eff-start" className="text-[11px]">
                    Effective Start (2026-07-08)
                  </Label>
                  <Input
                    id="lic-eff-start"
                    type="date"
                    value={formEffectiveStart}
                    onChange={(e) => setFormEffectiveStart(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lic-eff-end" className="text-[11px]">
                    Effective End (2027-07-07)
                  </Label>
                  <Input
                    id="lic-eff-end"
                    type="date"
                    value={formEffectiveEnd}
                    onChange={(e) => setFormEffectiveEnd(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Region</Label>
                <Select value={formRegion} onValueChange={setFormRegion}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETHIOPIAN_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lic-zone" className="text-xs font-semibold">
                  Zone
                </Label>
                <Input
                  id="lic-zone"
                  value={formZone}
                  onChange={(e) => setFormZone(e.target.value)}
                  placeholder="Zone"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lic-woreda" className="text-xs font-semibold">
                  Woreda
                </Label>
                <Input
                  id="lic-woreda"
                  value={formWoreda}
                  onChange={(e) => setFormWoreda(e.target.value)}
                  placeholder="Woreda"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Shapefile / GIS Coordinate Picker */}
            <ShapefileCoordinatePicker
              initialGeoJSON={formBoundary}
              initialLatitude={formCentroidLat}
              initialLongitude={formCentroidLon}
              onChange={(geoJSON, lat, lon) => {
                setFormBoundary(geoJSON);
                setFormCentroidLat(lat);
                setFormCentroidLon(lon);
              }}
            />

            <div className="space-y-1.5">
              <Label htmlFor="lic-desc" className="text-xs font-semibold">
                Description / Notes
              </Label>
              <Textarea
                id="lic-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Access road, landmark, inspection comments..."
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsIssueModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreating ? "Issuing..." : "Issue License"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
      {selectedLicenseForProduction && (
        <LicenseProductionAssignModal
          license={selectedLicenseForProduction}
          companyId={companyId}
          open={Boolean(selectedLicenseForProduction)}
          onOpenChange={(open) => {
            if (!open) setSelectedLicenseForProduction(null);
          }}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
