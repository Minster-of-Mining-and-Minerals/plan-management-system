"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useUpdateLicenseMutation, useGetLicenseTypesQuery } from "@/redux/api/licenseApi";
import type { CompanyLicense, UpdateLicensePayload } from "@/redux/types/license";
import { ShapefileCoordinatePicker } from "@/components/gis/ShapefileCoordinatePicker";
import { actionFeedback } from "@/components/action-feedback";

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

interface EditLicenseModalProps {
  license: CompanyLicense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditLicenseModal({
  license,
  open,
  onOpenChange,
  onSuccess,
}: EditLicenseModalProps) {
  const { data: licenseTypes = [] } = useGetLicenseTypesQuery();
  const [updateLicense, { isLoading }] = useUpdateLicenseMutation();

  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseName, setLicenseName] = useState("");
  const [licenseTypeId, setLicenseTypeId] = useState("");
  const [mineralType, setMineralType] = useState("");
  const [status, setStatus] = useState("active");
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [effectiveStartDate, setEffectiveStartDate] = useState("2026-07-08");
  const [effectiveEndDate, setEffectiveEndDate] = useState("2027-07-07");
  const [description, setDescription] = useState("");

  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<any>(null);
  const [centroidLat, setCentroidLat] = useState<number | null>(null);
  const [centroidLon, setCentroidLon] = useState<number | null>(null);

  const handleCoordinateChange = useCallback((geoJSON: any, lat: number | null, lon: number | null) => {
    setBoundaryGeoJSON(geoJSON);
    setCentroidLat(lat);
    setCentroidLon(lon);
  }, []);

  useEffect(() => {
    if (license && open) {
      setLicenseNumber(license.license_number || "");
      setLicenseName(license.license_name || "");
      setLicenseTypeId(license.license_type_id || "");
      setMineralType(license.mineral_type || "");
      setStatus(license.status || "active");
      setRegion(license.region || "");
      setZone(license.zone || "");
      setWoreda(license.woreda || "");
      setLocationDetails(license.location_details || "");
      setIssuedDate(license.issued_date || "");
      setEffectiveStartDate(license.effective_start_date || "2026-07-08");
      setEffectiveEndDate(license.effective_end_date || "2027-07-07");
      setDescription(license.description || "");
      setBoundaryGeoJSON(license.boundary_geojson || null);
      setCentroidLat(license.latitude != null ? Number(license.latitude) : null);
      setCentroidLon(license.longitude != null ? Number(license.longitude) : null);
    }
  }, [license, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;

    if (!licenseNumber.trim()) {
      actionFeedback.error("License Number is required.");
      return;
    }
    if (!licenseTypeId) {
      actionFeedback.error("Please select a License Type.");
      return;
    }

    try {
      const payload: UpdateLicensePayload = {
        license_number: licenseNumber.trim(),
        license_name: licenseName.trim() || undefined,
        license_type_id: licenseTypeId,
        mineral_type: mineralType.trim() || undefined,
        status: status as any,
        region: region.trim() || undefined,
        zone: zone.trim() || undefined,
        woreda: woreda.trim() || undefined,
        location_details: locationDetails.trim() || undefined,
        issued_date: issuedDate || undefined,
        effective_start_date: effectiveStartDate || "2026-07-08",
        effective_end_date: effectiveEndDate || "2027-07-07",
        description: description.trim() || undefined,
        boundary_geojson: boundaryGeoJSON,
        latitude: centroidLat !== null ? centroidLat : undefined,
        longitude: centroidLon !== null ? centroidLon : undefined,
      };

      await updateLicense({
        id: license.license_id,
        data: payload,
      }).unwrap();

      actionFeedback.success(`License ${licenseNumber} updated successfully.`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update license.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit License</DialogTitle>
          <DialogDescription>
            Update administrative details, validity window, and GIS coordinates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Top row: License Number, Type, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-lic-no" className="text-xs font-semibold">
                License Number *
              </Label>
              <Input
                id="edit-lic-no"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. MOM/EL/00055/2025"
                className="text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">License Type *</Label>
              <Select value={licenseTypeId} onValueChange={setLicenseTypeId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Type" />
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: License Name, Mineral Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-lic-name" className="text-xs font-semibold">
                License Name / Title
              </Label>
              <Input
                id="edit-lic-name"
                value={licenseName}
                onChange={(e) => setLicenseName(e.target.value)}
                placeholder="Concession / Project name"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-mineral" className="text-xs font-semibold">
                Mineral Type
              </Label>
              <Input
                id="edit-mineral"
                value={mineralType}
                onChange={(e) => setMineralType(e.target.value)}
                placeholder="e.g. Primary Gold, Limestone, Opal"
                className="text-xs"
              />
            </div>
          </div>

          {/* Row 3: Validity Range (Default 2026-07-08 to 2027-07-07) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Validity Window (Ethiopian Fiscal Year 2019)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-issued-date" className="text-[11px]">
                  Issued Date
                </Label>
                <Input
                  id="edit-issued-date"
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-eff-start" className="text-[11px]">
                  Effective Start (2026-07-08)
                </Label>
                <Input
                  id="edit-eff-start"
                  type="date"
                  value={effectiveStartDate}
                  onChange={(e) => setEffectiveStartDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-eff-end" className="text-[11px]">
                  Effective End (2027-07-07)
                </Label>
                <Input
                  id="edit-eff-end"
                  type="date"
                  value={effectiveEndDate}
                  onChange={(e) => setEffectiveEndDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 4: Administrative Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Region</Label>
              <Select value={region} onValueChange={setRegion}>
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
              <Label htmlFor="edit-zone" className="text-xs font-semibold">
                Zone
              </Label>
              <Input
                id="edit-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Zone"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-woreda" className="text-xs font-semibold">
                Woreda
              </Label>
              <Input
                id="edit-woreda"
                value={woreda}
                onChange={(e) => setWoreda(e.target.value)}
                placeholder="Woreda"
                className="text-xs"
              />
            </div>
          </div>

          {/* Row 5: Shapefile / GIS Boundary coordinates */}
          <ShapefileCoordinatePicker
            initialGeoJSON={boundaryGeoJSON}
            initialLatitude={centroidLat}
            initialLongitude={centroidLon}
            onChange={handleCoordinateChange}
          />

          {/* Row 6: Description / Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc" className="text-xs font-semibold">
              Description / Notes
            </Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Inspection site details, boundary landmarks..."
              className="text-xs"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? "Saving..." : "Save License Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
