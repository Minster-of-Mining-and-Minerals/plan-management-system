"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  FileText,
  Building2,
  Calendar,
  MapPin,
  Gem,
  Factory,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ExternalLink,
  Plus,
  Compass,
  Edit,
  Save,
  X,
  Map as MapIcon,
  Globe,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useGetLicenseByIdQuery,
  useGetLicenseTypesQuery,
  useUpdateLicenseMutation,
} from "@/redux/api/licenseApi";
import { useGetAssignmentsQuery } from "@/redux/api/productionApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { LicenseProductionAssignModal } from "@/features/production/LicenseProductionAssignModal";
import { EditAssignmentModal } from "@/features/production/EditAssignmentModal";
import { ShapefileCoordinatePicker } from "@/components/gis/ShapefileCoordinatePicker";
import type { CompanyProductionAssignment } from "@/redux/types/production";
import { toast } from "sonner";

// Dynamic import with SSR disabled for boundary map
const LicenseBoundaryMap = dynamic(() => import("@/components/gis/LicenseBoundaryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
      <div className="text-center space-y-2">
        <Loading01 />
        <p className="text-xs text-slate-500">Loading GIS Boundary map...</p>
      </div>
    </div>
  ),
});

function decimalToDMS(dec: number, isLat: boolean): string {
  const absolute = Math.abs(dec);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
  const direction = isLat ? (dec >= 0 ? "N" : "S") : dec >= 0 ? "E" : "W";
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

const REGION_OPTIONS = [
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Gambella",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "South West Ethiopia",
  "Tigray",
  "Dire Dawa",
  "Addis Ababa",
];

export function LicenseDetailView({ licenseId }: { licenseId: string }) {
  const { data: license, isLoading, isError, refetch } = useGetLicenseByIdQuery(licenseId);
  const { data: licenseTypes = [] } = useGetLicenseTypesQuery({ is_active: true });
  const { data: assignments = [], refetch: refetchAssignments } = useGetAssignmentsQuery(
    license ? { license_id: license.license_id } : undefined,
    { skip: !license }
  );

  const [updateLicense, { isLoading: isUpdatingLicense }] = useUpdateLicenseMutation();

  // Modals state
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CompanyProductionAssignment | null>(null);

  // Tab 1 (GIS Boundary) Edit state
  const [isEditingGIS, setIsEditingGIS] = useState(false);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any>(null);
  const [gisLatitude, setGisLatitude] = useState<number | null>(null);
  const [gisLongitude, setGisLongitude] = useState<number | null>(null);
  const [spatialReference, setSpatialReference] = useState("");
  const [locationDetails, setLocationDetails] = useState("");

  // Tab 3 (Administrative Details) Edit state
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminLicenseNumber, setAdminLicenseNumber] = useState("");
  const [adminLicenseName, setAdminLicenseName] = useState("");
  const [adminLicenseTypeId, setAdminLicenseTypeId] = useState("");
  const [adminMineralType, setAdminMineralType] = useState("");
  const [adminRegion, setAdminRegion] = useState("");
  const [adminZone, setAdminZone] = useState("");
  const [adminWoreda, setAdminWoreda] = useState("");
  const [adminStatus, setAdminStatus] = useState("active");
  const [adminIssuedDate, setAdminIssuedDate] = useState("");
  const [adminEffectiveStart, setAdminEffectiveStart] = useState("2026-07-08");
  const [adminEffectiveEnd, setAdminEffectiveEnd] = useState("2027-07-07");
  const [adminDescription, setAdminDescription] = useState("");

  // Populate GIS edit state when license loads
  useEffect(() => {
    if (license) {
      setBoundaryGeoJson(license.boundary_geojson || null);
      setGisLatitude(license.latitude ? Number(license.latitude) : null);
      setGisLongitude(license.longitude ? Number(license.longitude) : null);
      setSpatialReference(license.spatial_reference || "GCS Adindan");
      setLocationDetails(license.location_details || "");
    }
  }, [license]);

  // Populate Admin edit state when license loads
  useEffect(() => {
    if (license) {
      setAdminLicenseNumber(license.license_number || "");
      setAdminLicenseName(license.license_name || "");
      setAdminLicenseTypeId(license.license_type_id || "");
      setAdminMineralType(license.mineral_type || "");
      setAdminRegion(license.region || "");
      setAdminZone(license.zone || "");
      setAdminWoreda(license.woreda || "");
      setAdminStatus(license.status || "active");
      setAdminIssuedDate(license.issued_date || "");
      setAdminEffectiveStart(license.effective_start_date || "2026-07-08");
      setAdminEffectiveEnd(license.effective_end_date || "2027-07-07");
      setAdminDescription(license.description || "");
    }
  }, [license]);

  if (isLoading) {
    return <Loading01 />;
  }

  if (isError || !license) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <FileText className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">License Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          The requested mining or exploration license does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/admin/licenses">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Licenses
          </Link>
        </Button>
      </div>
    );
  }

  const isMining = (license.licenseType?.name || "").toLowerCase().includes("mining");
  const vertices = license.vertices || [];

  // Handle Save GIS Boundary
  const handleSaveGIS = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateLicense({
        id: license.license_id,
        data: {
          boundary_geojson: boundaryGeoJson || undefined,
          latitude: gisLatitude !== null ? gisLatitude : undefined,
          longitude: gisLongitude !== null ? gisLongitude : undefined,
          spatial_reference: spatialReference || undefined,
          location_details: locationDetails || undefined,
        },
      }).unwrap();

      toast.success("GIS boundary and coordinates updated successfully.");
      setIsEditingGIS(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to update GIS boundary.");
    }
  };

  // Handle Save Administrative Details
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminLicenseNumber.trim()) {
      toast.error("License number is required.");
      return;
    }

    try {
      await updateLicense({
        id: license.license_id,
        data: {
          license_number: adminLicenseNumber.trim(),
          license_name: adminLicenseName.trim() || undefined,
          license_type_id: adminLicenseTypeId || undefined,
          mineral_type: adminMineralType.trim() || undefined,
          region: adminRegion.trim() || undefined,
          zone: adminZone.trim() || undefined,
          woreda: adminWoreda.trim() || undefined,
          status: adminStatus as any,
          issued_date: adminIssuedDate || undefined,
          effective_start_date: adminEffectiveStart || "2026-07-08",
          effective_end_date: adminEffectiveEnd || "2027-07-07",
          description: adminDescription || undefined,
        },
      }).unwrap();

      toast.success("Administrative details updated successfully.");
      setIsEditingAdmin(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to update administrative details.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Back */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
          <Link href={`/admin/companies/${license.company_id}?tab=licenses`}>
            <ArrowLeft className="h-4 w-4" />
            Back to {license.company?.name || "Company"}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsProductionModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Factory className="h-3.5 w-3.5" />
            Assign Production Item
          </Button>
        </div>
      </div>

      {/* Main License Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                {license.license_number}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-semibold ${
                  isMining
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                {license.licenseType?.name || "License"}
              </Badge>
              <Badge
                variant={license.status === "active" ? "default" : "secondary"}
                className={
                  license.status === "active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40"
                    : ""
                }
              >
                {license.status}
              </Badge>
            </div>

            {license.license_name && (
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                {license.license_name}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>Company:</span>
                <Link
                  href={`/admin/companies/${license.company_id}`}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  {license.company?.name || "N/A"}
                </Link>
                {license.company?.abbreviation && (
                  <span className="text-slate-400 font-mono">({license.company.abbreviation})</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Gem className="h-4 w-4 text-indigo-500" />
                <span>Mineral:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {license.mineral_type || "N/A"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Location:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {[license.region, license.zone, license.woreda].filter(Boolean).join(", ") || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Validity Badge */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[240px] text-xs space-y-1">
            <div className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
              Validity & Reporting Window
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
              {license.effective_start_date || "2026-07-08"} &rarr; {license.effective_end_date || "2027-07-07"}
            </div>
            {license.issued_date && (
              <div className="text-slate-500 text-[11px]">
                Issued Date: {license.issued_date}
              </div>
            )}
            <div className="text-slate-400 text-[10px]">
              Reporting Concession Year: 2026/2027 GC
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <MapIcon className="h-3.5 w-3.5" />
            GIS Boundary & Coordinates
          </TabsTrigger>
          <TabsTrigger value="production" className="text-xs gap-1.5">
            <Factory className="h-3.5 w-3.5" />
            Assigned Production Reporting ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Administrative Details
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* Tab 1: GIS Boundary & Map */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Geographical Information System (GIS) Boundary
              </h3>
              <p className="text-xs text-slate-500">
                Spatial boundary polygons, geographic coordinates, and cartographic projections.
              </p>
            </div>
            <div>
              {isEditingGIS ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingGIS(false)}
                  className="text-xs gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Editing
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingGIS(true)}
                  className="text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit GIS Boundary
                </Button>
              )}
            </div>
          </div>

          {isEditingGIS ? (
            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-blue-950 dark:text-blue-200">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    Edit GIS Boundary & Coordinates
                  </span>
                  <Badge variant="outline" className="text-[11px] bg-blue-100/60 text-blue-800">
                    Separate Edit & Save
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {/* Shapefile / Coordinate Picker */}
                <ShapefileCoordinatePicker
                  initialGeoJSON={boundaryGeoJson}
                  initialLatitude={gisLatitude}
                  initialLongitude={gisLongitude}
                  onChange={(geojson, latitude, longitude) => {
                    setBoundaryGeoJson(geojson);
                    setGisLatitude(latitude);
                    setGisLongitude(longitude);
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Centroid Latitude (°)</Label>
                    <Input
                      type="number"
                      step="any"
                      className="text-xs font-mono"
                      value={gisLatitude ?? ""}
                      onChange={(e) => setGisLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 13.9180"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Centroid Longitude (°)</Label>
                    <Input
                      type="number"
                      step="any"
                      className="text-xs font-mono"
                      value={gisLongitude ?? ""}
                      onChange={(e) => setGisLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="e.g. 38.3180"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Spatial Reference / Datum</Label>
                    <Input
                      className="text-xs font-mono"
                      value={spatialReference}
                      onChange={(e) => setSpatialReference(e.target.value)}
                      placeholder="e.g. GCS Adindan or WGS 84"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Location / Geographical Details</Label>
                  <Textarea
                    className="text-xs"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                    placeholder="Specific geographical landmarks, block identifiers, or boundary notes..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingGIS(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUpdatingLicense}
                    onClick={handleSaveGIS}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isUpdatingLicense ? "Saving GIS..." : "Save GIS Boundary"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Column */}
              <div className="lg:col-span-2 space-y-3">
                <LicenseBoundaryMap license={license} height="480px" />
              </div>

              {/* Coordinates / Vertex Table Column */}
              <div className="lg:col-span-1 space-y-3">
                <Card className="h-[480px] flex flex-col shadow-sm">
                  <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="text-xs uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Boundary Vertices ({vertices.length})</span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        {license.spatial_reference || "GCS Adindan"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto">
                    {vertices.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No boundary coordinate vertices loaded for this license.
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setIsEditingGIS(true)}
                          className="block mx-auto mt-2 text-xs text-blue-600"
                        >
                          Provide Coordinates Now &rarr;
                        </Button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b text-[10px] uppercase text-slate-500">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Latitude</th>
                            <th className="py-2 px-3">Longitude</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {vertices.map((v) => (
                            <tr key={v.order} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-1.5 px-3 font-bold text-slate-600 dark:text-slate-400">
                                {v.order}
                              </td>
                              <td className="py-1.5 px-3">
                                <div>{v.latitude.toFixed(6)}°</div>
                                <div className="text-[10px] text-slate-400 font-sans">
                                  {decimalToDMS(v.latitude, true)}
                                </div>
                              </td>
                              <td className="py-1.5 px-3">
                                <div>{v.longitude.toFixed(6)}°</div>
                                <div className="text-[10px] text-slate-400 font-sans">
                                  {decimalToDMS(v.longitude, false)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Tab 2: Production Reporting Assignments Table */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="production" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Factory className="h-4 w-4 text-emerald-600" />
                  Assigned Production Items & Reporting Table
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Minerals and commodities configured for periodic production reports, unit definitions, and target allocations.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsProductionModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Assign Production Item
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="p-10 text-center border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                <Factory className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Production Items Configured
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Assign production items (e.g. Gold, Marble, Coal, Limestone) to establish reporting frequencies and production targets under this concession.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsProductionModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Configure Reporting Now
                </Button>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-slate-600 dark:text-slate-400 border-b text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Production Item</th>
                        <th className="py-3 px-3">Reporting Frequency</th>
                        <th className="py-3 px-3">Target Allocation Depth</th>
                        <th className="py-3 px-3">Default Unit</th>
                        <th className="py-3 px-3">Effective Validity</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {assignments.map((asgn) => {
                        const freqName = asgn.reportingFrequency?.name || "Quarterly";
                        const isDaily = freqName.toLowerCase().includes("daily");
                        const isMonthly = freqName.toLowerCase().includes("month");

                        return (
                          <tr key={asgn.assignment_id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                {asgn.productionItem?.name || "Production Item"}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                                <span>{asgn.productionItem?.code}</span>
                                {asgn.productionItem?.category && (
                                  <span>&bull; {asgn.productionItem?.category}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-semibold ${
                                  isDaily
                                    ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                                    : isMonthly
                                    ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                }`}
                              >
                                {freqName}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-3 capitalize font-medium text-slate-700 dark:text-slate-300">
                              {asgn.target_allocation_depth}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {asgn.defaultReportingUnit?.symbol || asgn.defaultReportingUnit?.name || "kg"}
                              </span>
                              {asgn.defaultReportingUnit?.name && (
                                <span className="text-slate-400 text-[11px] ml-1">
                                  ({asgn.defaultReportingUnit.name})
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {asgn.effective_from || "2026-07-08"} &rarr; {asgn.effective_to || "2027-07-07"}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <Badge
                                variant={asgn.is_active ? "default" : "secondary"}
                                className={`text-[10px] ${
                                  asgn.is_active ? "bg-emerald-100 text-emerald-800" : ""
                                }`}
                              >
                                {asgn.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingAssignment(asgn)}
                                  className="h-7 text-xs px-2 gap-1 text-slate-700 hover:text-slate-900"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" asChild className="h-7 text-xs px-2 text-blue-600">
                                  <Link href={`/admin/companies/${license.company_id}?tab=production`}>
                                    Targets &rarr;
                                  </Link>
                                </Button>
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
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Tab 3: Administrative Details */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="details" className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Administrative & Concession Metadata
              </h3>
              <p className="text-xs text-slate-500">
                Jurisdiction, regional administrative location, issuance dates, and validity window.
              </p>
            </div>
            <div>
              {isEditingAdmin ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingAdmin(false)}
                  className="text-xs gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Editing
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingAdmin(true)}
                  className="text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Administrative Details
                </Button>
              )}
            </div>
          </div>

          {isEditingAdmin ? (
            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-blue-950 dark:text-blue-200">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Edit Administrative Details & Location
                  </span>
                  <Badge variant="outline" className="text-[11px] bg-blue-100/60 text-blue-800">
                    Separate Edit & Save
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <form onSubmit={handleSaveAdmin} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* License Number */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">License Number *</Label>
                      <Input
                        className="text-xs font-mono font-bold"
                        value={adminLicenseNumber}
                        onChange={(e) => setAdminLicenseNumber(e.target.value)}
                        required
                      />
                    </div>

                    {/* License Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">License Name / Concession</Label>
                      <Input
                        className="text-xs"
                        value={adminLicenseName}
                        onChange={(e) => setAdminLicenseName(e.target.value)}
                        placeholder="e.g. DMG Gold Concession"
                      />
                    </div>

                    {/* License Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">License Type</Label>
                      <Select value={adminLicenseTypeId} onValueChange={setAdminLicenseTypeId}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {licenseTypes.map((t) => (
                            <SelectItem key={t.license_type_id} value={t.license_type_id} className="text-xs">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Mineral Type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Mineral Type</Label>
                      <Input
                        className="text-xs"
                        value={adminMineralType}
                        onChange={(e) => setAdminMineralType(e.target.value)}
                        placeholder="e.g. Gold, Gemstones, Coal"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Concession Status</Label>
                      <Select value={adminStatus} onValueChange={setAdminStatus}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">Active</SelectItem>
                          <SelectItem value="suspended" className="text-xs">Suspended</SelectItem>
                          <SelectItem value="expired" className="text-xs">Expired</SelectItem>
                          <SelectItem value="revoked" className="text-xs">Revoked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Region */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Region</Label>
                      <Select value={adminRegion} onValueChange={setAdminRegion}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select Region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGION_OPTIONS.map((reg) => (
                            <SelectItem key={reg} value={reg} className="text-xs">
                              {reg}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Zone */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Zone</Label>
                      <Input
                        className="text-xs"
                        value={adminZone}
                        onChange={(e) => setAdminZone(e.target.value)}
                        placeholder="e.g. West Gojjam, Sidama, Borena"
                      />
                    </div>

                    {/* Woreda */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Woreda</Label>
                      <Input
                        className="text-xs"
                        value={adminWoreda}
                        onChange={(e) => setAdminWoreda(e.target.value)}
                        placeholder="e.g. Shakiso, Dilla, Adola"
                      />
                    </div>
                  </div>

                  {/* Dates: Issued, Effective Start, Effective End */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Issued Date</Label>
                      <Input
                        type="date"
                        className="text-xs font-mono"
                        value={adminIssuedDate}
                        onChange={(e) => setAdminIssuedDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Effective Start Date (Year From)</Label>
                      <Input
                        type="date"
                        className="text-xs font-mono"
                        value={adminEffectiveStart}
                        onChange={(e) => setAdminEffectiveStart(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Effective End Date (Year To)</Label>
                      <Input
                        type="date"
                        className="text-xs font-mono"
                        value={adminEffectiveEnd}
                        onChange={(e) => setAdminEffectiveEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">License Description / Terms</Label>
                    <Textarea
                      className="text-xs"
                      value={adminDescription}
                      onChange={(e) => setAdminDescription(e.target.value)}
                      placeholder="Concession specifications, operational stipulations, or notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingAdmin(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isUpdatingLicense}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isUpdatingLicense ? "Saving Administrative..." : "Save Administrative Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Administrative Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Region:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{license.region || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Zone:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{license.zone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Woreda:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{license.woreda || "N/A"}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500">Location Notes:</span>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded">
                      {license.location_details || license.description || "No specific location remarks recorded."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    License Holder Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Registered Name:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{license.company?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-500">Company Code:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{license.company?.code}</span>
                  </div>
                  {license.company?.abbreviation && (
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Abbreviation:</span>
                      <span className="font-mono font-semibold">{license.company.abbreviation}</span>
                    </div>
                  )}
                  {license.company?.email && (
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Contact Email:</span>
                      <span>{license.company.email}</span>
                    </div>
                  )}
                  {license.company?.phone && (
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-slate-500">Phone:</span>
                      <span>{license.company.phone}</span>
                    </div>
                  )}
                  <div className="pt-1">
                    <span className="text-slate-500">Description / Terms:</span>
                    <p className="mt-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded">
                      {license.description || "No specific license description specified."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Production Assignment Modal (Create) */}
      {isProductionModalOpen && (
        <LicenseProductionAssignModal
          license={license}
          companyId={license.company_id}
          open={isProductionModalOpen}
          onOpenChange={setIsProductionModalOpen}
          onSuccess={() => {
            refetch();
            refetchAssignments();
          }}
        />
      )}

      {/* Edit Production Assignment Modal (Edit) */}
      {editingAssignment && (
        <EditAssignmentModal
          assignment={editingAssignment}
          open={!!editingAssignment}
          onOpenChange={(open) => !open && setEditingAssignment(null)}
          onSuccess={() => {
            refetch();
            refetchAssignments();
          }}
        />
      )}
    </div>
  );
}
