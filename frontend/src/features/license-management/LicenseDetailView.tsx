"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useGetLicenseByIdQuery } from "@/redux/api/licenseApi";
import { useGetAssignmentsQuery } from "@/redux/api/productionApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { LicenseProductionAssignModal } from "@/features/production/LicenseProductionAssignModal";

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

export function LicenseDetailView({ licenseId }: { licenseId: string }) {
  const { data: license, isLoading, isError, refetch } = useGetLicenseByIdQuery(licenseId);
  const { data: assignments = [], refetch: refetchAssignments } = useGetAssignmentsQuery(
    license ? { license_id: license.license_id } : undefined,
    { skip: !license }
  );

  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);

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
            Configure Production Reporting
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
            </div>
          </div>

          {/* Validity Badge */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[220px] text-xs space-y-1">
            <div className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
              Validity & Reporting Window
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {license.effective_start_date || license.effective_year_from || "Start"} &rarr;{" "}
              {license.effective_end_date || license.effective_year_to || "Indefinite"}
            </div>
            {license.issued_date && (
              <div className="text-slate-500 text-[11px]">
                Issued Date: {license.issued_date}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="overview" className="text-xs">
            GIS Boundary & Coordinates
          </TabsTrigger>
          <TabsTrigger value="production" className="text-xs">
            Assigned Production Reporting ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            Administrative Details
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: GIS Boundary & Map */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Column */}
            <div className="lg:col-span-2 space-y-3">
              <LicenseBoundaryMap license={license} height="480px" />
            </div>

            {/* Coordinates / Vertex Table Column */}
            <div className="lg:col-span-1 space-y-3">
              <Card className="h-[480px] flex flex-col">
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
        </TabsContent>

        {/* Tab 2: Production Reporting Assignments */}
        <TabsContent value="production" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Production Reporting Configurations
                </h3>
                <p className="text-xs text-slate-500">
                  Production items, frequencies, and target depth configured specifically for this mining concession.
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
              <div className="p-8 text-center border border-dashed rounded-lg">
                <Factory className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No Production Items Configured
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                  Assign production items (e.g. Gold, Marble, Coal) to track periodic targets and submit production reports under this license.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsProductionModalOpen(true)}
                >
                  Configure Reporting
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b">
                    <tr>
                      <th className="py-2.5 px-3">Production Item</th>
                      <th className="py-2.5 px-3">Reporting Frequency</th>
                      <th className="py-2.5 px-3">Allocation Depth</th>
                      <th className="py-2.5 px-3">Default Unit</th>
                      <th className="py-2.5 px-3">Reporting Period</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assignments.map((asgn) => (
                      <tr key={asgn.assignment_id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {asgn.productionItem?.name || "Production Item"}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline">{asgn.reportingFrequency?.name || "Frequency"}</Badge>
                        </td>
                        <td className="py-3 px-3 capitalize">{asgn.target_allocation_depth}</td>
                        <td className="py-3 px-3">
                          {asgn.defaultReportingUnit?.name || "Base Unit"} (
                          {asgn.defaultReportingUnit?.symbol || ""})
                        </td>
                        <td className="py-3 px-3">
                          {asgn.effective_from} &rarr; {asgn.effective_to || "Indefinite"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button size="sm" variant="ghost" asChild className="h-7 text-xs">
                            <Link href={`/admin/companies/${license.company_id}?tab=production`}>
                              Manage Targets &rarr;
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Administrative Details */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
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

            <Card>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Production Assignment Modal */}
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
    </div>
  );
}
