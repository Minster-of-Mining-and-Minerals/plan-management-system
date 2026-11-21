"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Layers,
  Gem,
  ExternalLink,
  Calendar,
  Building2,
  Factory,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useGetCompanyLicensesQuery } from "@/redux/api/licenseApi";
import type { CompanyLicense } from "@/redux/types/license";
import Loading01 from "@/features/template/component/Loading/Loading01";
import Link from "next/link";

// Dynamic import with SSR disabled for Leaflet Map
const LeafletMap = dynamic(() => import("@/components/gis/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
      <div className="text-center space-y-2">
        <Loading01 />
        <p className="text-xs text-slate-500">Loading GIS interactive map...</p>
      </div>
    </div>
  ),
});

interface CompanyLicenseMapTabProps {
  companyId: string;
  companyName: string;
}

export function CompanyLicenseMapTab({
  companyId,
  companyName,
}: CompanyLicenseMapTabProps) {
  const { data: licenses = [], isLoading } = useGetCompanyLicensesQuery(companyId);
  const [selectedLicense, setSelectedLicense] = useState<CompanyLicense | null>(null);

  const companyLicenses = React.useMemo(() => {
    return licenses.filter((l) => l.company_id === companyId);
  }, [licenses, companyId]);

  if (isLoading) {
    return <Loading01 />;
  }

  const miningCount = companyLicenses.filter((l) =>
    (l.licenseType?.name || "").toLowerCase().includes("mining")
  ).length;
  const explorationCount = companyLicenses.length - miningCount;
  const withGisCount = companyLicenses.filter(
    (l) => l.boundary_geojson?.coordinates?.[0]?.length || (l.latitude && l.longitude)
  ).length;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Licenses
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {licenses.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">
            Mining Concessions
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
            {miningCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
            Exploration Blocks
          </div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">
            {explorationCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">
            GIS Mapped Boundaries
          </div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-0.5">
            {withGisCount} / {companyLicenses.length}
          </div>
        </div>
      </div>

      {/* Main Map + License Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Side: License Concession Cards */}
        <div className="lg:col-span-1 space-y-2 max-h-[560px] overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-1 py-0.5 flex items-center justify-between">
            <span>Concessions List</span>
            <span className="text-[11px] text-slate-400 font-normal">Click to focus</span>
          </div>

          {companyLicenses.map((lic) => {
            const isSelected = selectedLicense?.license_id === lic.license_id;
            const isMining = (lic.licenseType?.name || "").toLowerCase().includes("mining");

            return (
              <div
                key={lic.license_id}
                onClick={() => setSelectedLicense(lic)}
                className={`p-3 rounded-lg border transition-all cursor-pointer text-xs space-y-1.5 ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {lic.license_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      isMining
                        ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                        : "text-amber-700 border-amber-300 bg-amber-50"
                    }`}
                  >
                    {lic.licenseType?.name || "License"}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <Gem className="h-3 w-3 text-indigo-500 shrink-0" />
                  <span className="truncate">{lic.mineral_type || "N/A"}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {[lic.region, lic.woreda].filter(Boolean).join(", ") || "Location N/A"}
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {lic.effective_year_from || "—"} &rarr; {lic.effective_year_to || "—"}
                  </span>
                  <Link
                    href={`/admin/licenses/${lic.license_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    Detail <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Leaflet Interactive Map */}
        <div className="lg:col-span-3">
          <LeafletMap
            licenses={companyLicenses}
            selectedLicenseId={selectedLicense?.license_id}
            onSelectLicense={(lic) => setSelectedLicense(lic)}
            height="560px"
          />
        </div>
      </div>
    </div>
  );
}
