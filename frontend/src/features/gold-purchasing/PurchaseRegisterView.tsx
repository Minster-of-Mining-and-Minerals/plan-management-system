"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Coins,
  Search,
  PlusCircle,
  Eye,
  Building2,
  HardHat,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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
import { usePermissions } from "@/hooks/usePermissions";
import { useGetGoldPurchasesQuery } from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { GoldOperationsTabsHeader } from "./GoldOperationsTabsHeader";

interface PurchaseRegisterViewProps {
  centerId?: string;
  isFederalOversight?: boolean;
}

export function PurchaseRegisterView({
  centerId,
  isFederalOversight = false,
}: PurchaseRegisterViewProps) {
  const params = useParams<{ id?: string }>();
  const activeCenterId = centerId || params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/admin/gold-operations";

  const { can } = usePermissions();

  const [search, setSearch] = useState("");
  const [sellerType, setSellerType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading, isFetching, refetch } = useGetGoldPurchasesQuery({
    purchasing_center_id: isFederalOversight ? undefined : activeCenterId,
    seller_type: sellerType !== "all" ? sellerType : undefined,
    status: status !== "all" ? status : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search.trim() || undefined,
    page,
    limit,
  });

  const purchases = data?.items || [];
  const pagination = data?.pagination;

  const resetFilters = () => {
    setSearch("");
    setSellerType("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {isFederalOversight && <GoldOperationsTabsHeader />}

      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Coins className="h-7 w-7 text-amber-500" />
            Gold Purchase Register
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFederalOversight
              ? "Centralized register of gold purchases recorded across all purchasing centers."
              : "Complete ledger of individual gold purchase transactions recorded by this purchasing center."}
          </p>
        </div>

        {!isFederalOversight && can("GOLD_PURCHASES:CREATE") && (
          <Button asChild className="gap-2 shadow-sm font-semibold shrink-0">
            <Link href={`${basePath}/purchases/new`}>
              <PlusCircle className="h-4 w-4" />
              Record Gold Purchase
            </Link>
          </Button>
        )}
      </div>

      {/* ----------------- SEARCH & FILTERS BAR ----------------- */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reference, seller..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Seller Type Filter */}
          <Select
            value={sellerType}
            onValueChange={(val) => {
              setSellerType(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seller Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seller Types</SelectItem>
              <SelectItem value="company">Registered Companies</SelectItem>
              <SelectItem value="asm">ASM Miners</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Transaction Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <Input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 text-sm"
          />

          {/* Date To */}
          <Input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Showing {purchases.length} of {pagination?.total || 0} record{pagination?.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            {(search || sellerType !== "all" || status !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                Reset Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-7 px-2 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ----------------- DATA TABLE ----------------- */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <Loading01 />
          </div>
        ) : purchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Date</th>
                  {isFederalOversight && <th className="py-3.5 px-4 font-semibold">Center</th>}
                  <th className="py-3.5 px-4 font-semibold">Seller Type</th>
                  <th className="py-3.5 px-4 font-semibold">Seller Name & Identifier</th>
                  <th className="py-3.5 px-4 font-semibold">Recorded Qty</th>
                  <th className="py-3.5 px-4 font-semibold">Canonical (g)</th>
                  <th className="py-3.5 px-4 font-semibold">Unit Price</th>
                  <th className="py-3.5 px-4 font-semibold">Total Value</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchases.map((p) => {
                  const detailsUrl = isFederalOversight
                    ? `/admin/gold-operations/purchases/${p.purchase_id}`
                    : `${basePath}/purchases/${p.purchase_id}`;

                  return (
                    <tr key={p.purchase_id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                        {p.purchase_reference}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {p.business_date}
                      </td>
                      {isFederalOversight && (
                        <td className="py-3.5 px-4 text-foreground font-medium">
                          {p.purchasingCenter?.name || "Purchasing Center"}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            p.seller_type === "company"
                              ? "text-sky-600 dark:text-sky-400 border-sky-400/30 text-[11px] gap-1"
                              : "text-amber-600 dark:text-amber-400 border-amber-400/30 text-[11px] gap-1"
                          }
                        >
                          {p.seller_type === "company" ? (
                            <>
                              <Building2 className="h-3 w-3" /> Company
                            </>
                          ) : (
                            <>
                              <HardHat className="h-3 w-3" /> ASM
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{p.seller_name_snapshot}</p>
                          {p.seller_identifier_snapshot && (
                            <p className="text-xs font-mono text-muted-foreground">
                              {p.seller_identifier_snapshot}
                            </p>
                          )}
                          {p.karat && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                                {p.karat} {p.quality_grade ? `• ${p.quality_grade}` : ""}
                              </span>
                              {p.is_custom_price && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1">
                                  Custom Override
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap">
                        {parseFloat(String(p.quantity)).toLocaleString()}{" "}
                        <span className="text-xs text-muted-foreground">{p.unit_code_snapshot}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-muted-foreground whitespace-nowrap">
                        {parseFloat(String(p.quantity_in_canonical_unit)).toLocaleString()} g
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {parseFloat(String(p.unit_price)).toLocaleString()} ETB
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                        {parseFloat(String(p.total_amount)).toLocaleString()} ETB
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={p.status === "completed" ? "default" : "destructive"}
                          className={
                            p.status === "completed"
                              ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                              : "text-[11px]"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">
                          <Link href={detailsUrl}>
                            <Eye className="h-3.5 w-3.5" />
                            Details
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <Coins className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <h3 className="text-base font-semibold text-foreground">No purchases found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No gold purchase records match your search criteria or filters.
            </p>
            {!isFederalOversight && can("GOLD_PURCHASES:CREATE") && (
              <Button asChild size="sm" className="gap-2 mt-2">
                <Link href={`${basePath}/purchases/new`}>
                  <PlusCircle className="h-4 w-4" /> Record Gold Purchase
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.total_pages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={pagination.page >= pagination.total_pages}
                className="h-8 gap-1 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
