"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FileBadge,
  ArrowLeft,
  Calendar,
  MapPin,
  Factory,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Gem,
  Building2,
  Clock,
  Layers,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useGetLicenseByIdQuery } from "@/redux/api/licenseApi";
import { useGetAssignmentsQuery } from "@/redux/api/productionApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

const LeafletMap = dynamic(() => import("@/components/gis/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
      <div className="text-center space-y-2">
        <Loading01 />
        <p className="text-xs text-slate-500">Loading GIS interactive boundary map...</p>
      </div>
    </div>
  ),
});

export function CompanyLicenseDetailView({
  overrideCompanyId,
  overrideLicenseId,
}: {
  overrideCompanyId?: string;
  overrideLicenseId?: string;
}) {
  const params = useParams<{ id: string; licenseId: string }>();
  const router = useRouter();
  const companyId = overrideCompanyId || params?.id;
  const licenseId = overrideLicenseId || params?.licenseId;

  const { data: license, isLoading: isLicenseLoading } = useGetLicenseByIdQuery(
    licenseId || "",
    { skip: !licenseId }
  );

  const { data: allAssignments = [], isLoading: isAssignmentsLoading } = useGetAssignmentsQuery(
    companyId ? { company_id: companyId } : undefined,
    { skip: !companyId }
  );

  const attachedProductions = useMemo(() => {
    return allAssignments.filter((a) => a.license_id === licenseId);
  }, [allAssignments, licenseId]);

  if (isLicenseLoading || isAssignmentsLoading) {
    return <Loading01 />;
  }

  if (!license) {
    return (
      <div className="p-8 text-center border rounded-2xl bg-destructive/5 text-destructive space-y-4 max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 mx-auto" />
        <h3 className="text-lg font-bold">License Not Found</h3>
        <p className="text-sm text-muted-foreground">
          The requested license concession record could not be found or verified.
        </p>
        <Button asChild variant="outline">
          <Link href={`/companies/${companyId}/licenses`}>Return to Licenses</Link>
        </Button>
      </div>
    );
  }

  const status = (license.status || "active").toLowerCase();
  const isActive = status === "active";
  const nowStr = new Date().toISOString().slice(0, 10);
  const isStarted = !license.effective_start_date || nowStr >= license.effective_start_date;
  const isExpired = license.effective_end_date && nowStr > license.effective_end_date;
  const isCurrentlyValid = isActive && isStarted && !isExpired;

  const coordinates = license.boundary_geojson?.coordinates?.[0] || [];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 gap-1 text-xs"
          >
            <Link href={`/companies/${companyId}/licenses`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Licenses
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground font-mono">
            License Detail: {license.license_number}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              isCurrentlyValid
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold"
                : "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
            }
          >
            {isCurrentlyValid ? "ELIGIBLE FOR PRODUCTION" : "REPORTING RESTRICTED"}
          </Badge>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card to-muted/20 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileBadge className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    (license.licenseType?.name || "").toLowerCase().includes("mining")
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  }
                >
                  {license.licenseType?.name || "Mining Concession"}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  Status: {license.status?.toUpperCase() || "ACTIVE"}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                {license.license_number}
              </h1>
              {license.license_name && (
                <p className="text-sm font-medium text-muted-foreground">
                  {license.license_name}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Mineral Target
              </div>
              <div className="text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                <Gem className="h-4 w-4 text-indigo-500" />
                {license.mineral_type || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Attached Productions
              </div>
              <div className="text-base font-bold text-primary flex items-center gap-1.5 mt-0.5">
                <Factory className="h-4 w-4" />
                {attachedProductions.length} Configured
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3.4 License Validity Alert */}
      {!isCurrentlyValid && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-start gap-3 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">License Concession Inactive or Expired</div>
            <p className="text-xs leading-relaxed opacity-90">
              This license is currently {license.status}. Under Federal Ministry regulations, production target proposals and periodic production reporting can only be configured and submitted during the active validity period of the license.
            </p>
          </div>
        </div>
      )}

      {/* 3.1 License Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Administrative Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Region:</span>
              <span className="font-medium text-foreground">{license.region || "Unspecified"}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Zone:</span>
              <span className="font-medium text-foreground">{license.zone || "Unspecified"}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Woreda:</span>
              <span className="font-medium text-foreground">{license.woreda || "Unspecified"}</span>
            </div>
            {license.location_details && (
              <div className="pt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Specific Location: </span>
                {license.location_details}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Effective Concession Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Issued Date:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.issued_date || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Effective Start:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.effective_start_date || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Effective End:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.effective_end_date || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Year Range:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.effective_year_from || "—"} to {license.effective_year_to || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Spatial & GIS Coordinates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Spatial Reference:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.spatial_reference || "GCS Adindan"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Centroid Latitude:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.latitude ? Number(license.latitude).toFixed(6) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-muted-foreground text-xs">Centroid Longitude:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {license.longitude ? Number(license.longitude).toFixed(6) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground text-xs">Polygon Vertices:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {coordinates.length} Boundary Points
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3.2 GIS Interactive Map */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/15 border-b pb-3">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              GIS Boundary & Spatial Visualization
            </span>
            <Badge variant="outline" className="text-xs font-normal">
              Spatial Concession Polygon
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Interactive geographical polygon and centroid coordinates for concession {license.license_number}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <LeafletMap
            licenses={[license]}
            selectedLicenseId={license.license_id}
            height="460px"
          />
        </CardContent>
      </Card>

      {/* 3.3 Production Attached to License */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/15 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Factory className="h-5 w-5 text-primary" />
                Production Items Attached to this License
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Central production obligations assigned by the Federal Ministry to this specific license.
              </CardDescription>
            </div>
            <div className="text-xs font-mono font-medium text-muted-foreground">
              {attachedProductions.length} Active Production Configuration(s)
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {attachedProductions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <Factory className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div className="text-sm font-medium">No Production Items Assigned Yet</div>
              <p className="text-xs max-w-md mx-auto">
                The Federal Ministry of Mines has not configured any production reporting items on this license yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Production Item</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Reporting Frequency</th>
                    <th className="py-3 px-4">Allocation Depth</th>
                    <th className="py-3 px-4">Target Status</th>
                    <th className="py-3 px-4">Reporting Availability</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attachedProductions.map((assign) => {
                    const targets = assign.targets || [];
                    const latestTarget = [...targets].sort(
                      (a, b) => b.version_number - a.version_number
                    )[0];
                    const approvedTarget = targets.find((t) => t.status === "approved" || t.status === "published");
                    const targetStatus = latestTarget ? latestTarget.status : "No Proposal";
                    const isReportingEnabled = Boolean(approvedTarget && isCurrentlyValid);

                    return (
                      <tr key={assign.assignment_id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          <Link
                            href={`/companies/${companyId}/productions/${assign.assignment_id}`}
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            <Factory className="h-4 w-4 shrink-0 text-primary" />
                            <span>{assign.productionItem?.name || "Mineral Production"}</span>
                          </Link>
                          {assign.productionItem?.code && (
                            <span className="text-[10px] font-mono text-muted-foreground ml-6">
                              Code: {assign.productionItem.code}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          {assign.defaultReportingUnit?.name || "Standard Unit"} (
                          {assign.defaultReportingUnit?.symbol || "unit"})
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {assign.reportingFrequency?.name || "Monthly"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="text-[11px] font-mono uppercase">
                            {assign.target_allocation_depth || "Quarterly"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={
                              targetStatus === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium"
                                : targetStatus === "submitted"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium"
                                : targetStatus === "revision_requested"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium"
                                : "bg-muted text-muted-foreground font-medium"
                            }
                          >
                            {targetStatus.replace("_", " ").toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={
                              isReportingEnabled
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold"
                                : "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
                            }
                          >
                            {isReportingEnabled ? "ENABLED" : "LOCKED"}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            asChild
                          >
                            <Link href={`/companies/${companyId}/productions/${assign.assignment_id}`}>
                              Open Production
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
