"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetLicensesQuery, useGetLicenseTypesQuery } from "@/redux/api/licenseApi";
import type { CompanyLicense } from "@/redux/types/license";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { LicenseTypeManagementModal } from "./LicenseTypeManagementModal";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  const { data: licenseTypes = [] } = useGetLicenseTypesQuery();
  const { data: licenses = [], isLoading, refetch } = useGetLicensesQuery({
    region: selectedRegion !== "all" ? selectedRegion : undefined,
    license_type_id: selectedTypeId !== "all" ? selectedTypeId : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    search: searchTerm.trim() || undefined,
  });

  // Client-side quick filter for instantaneous typing response
  const filteredLicenses = useMemo(() => {
    if (!searchTerm.trim()) return licenses;
    const term = searchTerm.toLowerCase().trim();
    return licenses.filter(
      (lic) =>
        lic.license_number.toLowerCase().includes(term) ||
        (lic.license_name && lic.license_name.toLowerCase().includes(term)) ||
        (lic.company?.name && lic.company.name.toLowerCase().includes(term)) ||
        (lic.mineral_type && lic.mineral_type.toLowerCase().includes(term)) ||
        (lic.region && lic.region.toLowerCase().includes(term)) ||
        (lic.woreda && lic.woreda.toLowerCase().includes(term))
    );
  }, [licenses, searchTerm]);

  const miningCount = licenses.filter((l) =>
    (l.licenseType?.name || "").toLowerCase().includes("mining")
  ).length;
  const explorationCount = licenses.length - miningCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            Mining & Exploration Licenses Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of all mineral concessions, exploration blocks, GIS boundary shapes, and production allocations across Ethiopia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Configure License Types Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTypeModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Settings className="h-3.5 w-3.5 text-slate-600" />
            License Types Config
          </Button>

          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <ListIcon className="h-3.5 w-3.5" />
              Table
            </Button>
            <Button
              type="button"
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <MapIcon className="h-3.5 w-3.5" />
              GIS Map
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Licenses
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {licenses.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Commercial Mining
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {miningCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Exploration Blocks
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {explorationCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Covered Regions
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
            {new Set(licenses.map((l) => l.region).filter(Boolean)).size} Regions
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by license number, company, mineral, woreda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Region Filter */}
          <div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {ETHIOPIAN_REGIONS.map((reg) => (
                  <SelectItem key={reg} value={reg}>
                    {reg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* License Type Filter */}
          <div>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All License Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {licenseTypes.map((lt) => (
                  <SelectItem key={lt.license_type_id} value={lt.license_type_id}>
                    {lt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content: Table or Map */}
      {isLoading ? (
        <Loading01 />
      ) : viewMode === "map" ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm">
          <LeafletMap licenses={filteredLicenses} height="650px" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">License Number</th>
                  <th className="px-4 py-3.5">Company Name</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Mineral</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Validity Period</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                {filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      No licenses match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map((lic) => {
                    const isMining = (lic.licenseType?.name || "").toLowerCase().includes("mining");
                    const hasBoundary = !!(lic.boundary_geojson?.coordinates?.[0]?.length);

                    return (
                      <tr
                        key={lic.license_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Link
                              href={`/admin/licenses/${lic.license_id}`}
                              className="hover:text-emerald-600 hover:underline font-mono"
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
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/companies/${lic.company?.company_id}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 hover:underline"
                          >
                            {lic.company?.name || "N/A"}
                          </Link>
                          {lic.company?.abbreviation && (
                            <span className="text-slate-400 font-mono ml-1">
                              ({lic.company.abbreviation})
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              isMining
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {lic.licenseType?.name || "License"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {lic.mineral_type || "N/A"}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{[lic.region, lic.woreda].filter(Boolean).join(", ") || "N/A"}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {lic.effective_start_date || lic.effective_year_from || "—"} to{" "}
                          {lic.effective_end_date || lic.effective_year_to || "—"}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {lic.production_items_count || 0}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            variant={lic.status === "active" ? "default" : "secondary"}
                            className={lic.status === "active" ? "bg-green-100 text-green-800" : ""}
                          >
                            {lic.status}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Link href={`/admin/licenses/${lic.license_id}`}>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* License Types Management Modal */}
      {isTypeModalOpen && (
        <LicenseTypeManagementModal
          open={isTypeModalOpen}
          onOpenChange={(open) => {
            setIsTypeModalOpen(open);
            refetch();
          }}
        />
      )}
    </div>
  );
}
