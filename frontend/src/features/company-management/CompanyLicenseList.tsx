"use client";

import { useState } from "react";
import Link from "next/link";
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
  Clock,
  Layers,
  AlertCircle,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { LicenseProductionAssignModal } from "@/features/production/LicenseProductionAssignModal";

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
  const { data: licenses = [], isLoading, refetch } = useGetCompanyLicensesQuery(companyId);
  const { data: licenseTypes = [] } = useGetLicenseTypesQuery();
  const [createLicense, { isLoading: isCreating }] = useCreateLicenseMutation();

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedLicenseForProduction, setSelectedLicenseForProduction] = useState<CompanyLicense | null>(null);

  // Form State
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formTypeId, setFormTypeId] = useState("");
  const [formMineral, setFormMineral] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formZone, setFormZone] = useState("");
  const [formWoreda, setFormWoreda] = useState("");
  const [formIssuedDate, setFormIssuedDate] = useState("");
  const [formEffectiveStart, setFormEffectiveStart] = useState("");
  const [formEffectiveEnd, setFormEffectiveEnd] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const resetForm = () => {
    setFormNumber("");
    setFormName("");
    setFormTypeId("");
    setFormMineral("");
    setFormRegion("");
    setFormZone("");
    setFormWoreda("");
    setFormIssuedDate("");
    setFormEffectiveStart("");
    setFormEffectiveEnd("");
    setFormDescription("");
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      toast.error("License Number is required");
      return;
    }
    if (!formTypeId) {
      toast.error("Please select a License Type");
      return;
    }

    if (formEffectiveStart && formEffectiveEnd && new Date(formEffectiveEnd) < new Date(formEffectiveStart)) {
      toast.error("Effective end date cannot precede effective start date");
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
        effective_start_date: formEffectiveStart || undefined,
        effective_end_date: formEffectiveEnd || undefined,
        description: formDescription.trim() || undefined,
        status: "active",
      };

      await createLicense(payload).unwrap();
      toast.success("Mining license issued successfully!");
      setIsIssueModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to issue license");
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Issued Mining & Exploration Licenses
            <Badge variant="secondary" className="ml-2 font-mono">
              {licenses.length}
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage individual mining & exploration concessions, mineral types, boundary polygons, and production reporting scopes.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsIssueModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Issue New License
        </Button>
      </div>

      {/* Licenses Table / Cards */}
      {licenses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No Licenses Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No mining or exploration licenses are currently associated with {companyName}. Click below to issue the first license.
          </p>
          <Button
            variant="outline"
            onClick={() => setIsIssueModalOpen(true)}
            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Issue First License
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">License Number</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Mineral</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Validity Period</th>
                  <th className="px-4 py-3.5">Production Items</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {licenses.map((lic) => {
                  const isMining = (lic.licenseType?.name || "").toLowerCase().includes("mining");
                  const hasBoundary = !!(lic.boundary_geojson?.coordinates?.[0]?.length);

                  return (
                    <tr
                      key={lic.license_id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Link
                            href={`/admin/licenses/${lic.license_id}`}
                            className="hover:text-emerald-600 hover:underline"
                          >
                            {lic.license_number}
                          </Link>
                          {hasBoundary && (
                            <span
                              title="GIS boundary coordinates loaded"
                              className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-mono px-1 py-0.2 rounded"
                            >
                              GIS
                            </span>
                          )}
                        </div>
                        {lic.license_name && (
                          <div className="text-xs text-slate-500 truncate max-w-[220px]">
                            {lic.license_name}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={
                            isMining
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                          }
                        >
                          {lic.licenseType?.name || "License"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <Gem className="h-3.5 w-3.5 text-indigo-500" />
                          {lic.mineral_type || "N/A"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{[lic.region, lic.zone, lic.woreda].filter(Boolean).join(", ") || "N/A"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>
                            {lic.effective_start_date || lic.effective_year_from || "—"} to{" "}
                            {lic.effective_end_date || lic.effective_year_to || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Factory className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {lic.production_items_count || 0}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          variant={lic.status === "active" ? "default" : "secondary"}
                          className={
                            lic.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                              : "bg-slate-100 text-slate-700"
                          }
                        >
                          {lic.status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Configure Production Reporting button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLicenseForProduction(lic)}
                            className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                            title="Configure Production Reporting for this License"
                          >
                            <Factory className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            Production
                          </Button>

                          {/* View details */}
                          <Link href={`/admin/licenses/${lic.license_id}`}>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issue License Dialog */}
      <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Issue New License — {companyName}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLicense} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="licNumber" className="text-xs font-semibold">
                  License Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licNumber"
                  placeholder="e.g. MOM/EL/00123/2026"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="licType" className="text-xs font-semibold">
                  License Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formTypeId} onValueChange={setFormTypeId}>
                  <SelectTrigger id="licType" className="mt-1">
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent>
                    {licenseTypes.map((lt) => (
                      <SelectItem key={lt.license_type_id} value={lt.license_type_id}>
                        {lt.name} ({lt.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mineral" className="text-xs font-semibold">
                  Mineral Type
                </Label>
                <Input
                  id="mineral"
                  placeholder="e.g. Primary Gold, Marble, Coal"
                  value={formMineral}
                  onChange={(e) => setFormMineral(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="licName" className="text-xs font-semibold">
                  License Title / Alias (Optional)
                </Label>
                <Input
                  id="licName"
                  placeholder="e.g. Kurmuk Concession Block A"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Administrative Location
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="region" className="text-xs">
                    Region
                  </Label>
                  <Input
                    id="region"
                    placeholder="e.g. Oromia"
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="zone" className="text-xs">
                    Zone
                  </Label>
                  <Input
                    id="zone"
                    placeholder="e.g. Guji"
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="woreda" className="text-xs">
                    Woreda
                  </Label>
                  <Input
                    id="woreda"
                    placeholder="e.g. Shakiso"
                    value={formWoreda}
                    onChange={(e) => setFormWoreda(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Validity & Timing (Production Reporting Scope)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="issuedDate" className="text-xs">
                    Official Issued Date
                  </Label>
                  <Input
                    id="issuedDate"
                    type="date"
                    value={formIssuedDate}
                    onChange={(e) => setFormIssuedDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate" className="text-xs">
                    Effective Start Date
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formEffectiveStart}
                    onChange={(e) => setFormEffectiveStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs">
                    Effective End Date
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formEffectiveEnd}
                    onChange={(e) => setFormEffectiveEnd(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="desc" className="text-xs">
                Description / Notes
              </Label>
              <Textarea
                id="desc"
                placeholder="Additional notes, technical details or site description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsIssueModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreating ? "Issuing..." : "Issue License"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Production Assignment Modal for License */}
      {selectedLicenseForProduction && (
        <LicenseProductionAssignModal
          license={selectedLicenseForProduction}
          companyId={companyId}
          open={!!selectedLicenseForProduction}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLicenseForProduction(null);
              refetch();
            }
          }}
        />
      )}
    </div>
  );
}
