"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  History,
  Calendar,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
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
import { useGetGoldHistoricalReportsQuery } from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface HistoricalReportsViewProps {
  centerId?: string;
  isFederalOversight?: boolean;
}

export function HistoricalReportsView({
  centerId,
  isFederalOversight = false,
}: HistoricalReportsViewProps) {
  const params = useParams<{ id?: string }>();
  const activeCenterId = centerId || params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/admin/gold-operations";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading, isFetching, refetch } = useGetGoldHistoricalReportsQuery({
    purchasing_center_id: isFederalOversight ? undefined : activeCenterId,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    status: status !== "all" ? status : undefined,
    page,
    limit,
  });

  const reports = data?.items || [];
  const pagination = data?.pagination;

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setStatus("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <History className="h-7 w-7 text-primary" />
            Historical Daily Purchasing Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official submitted daily records and transaction audits preserved across business reporting periods.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
          <Link href={`${basePath}/reports/daily`}>
            <Calendar className="h-4 w-4 text-emerald-600" /> Today&apos;s Daily Report
          </Link>
        </Button>
      </div>

      {/* ----------------- FILTERS BAR ----------------- */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Report Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Found {reports.length} of {pagination?.total || 0} submitted report{pagination?.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            {(dateFrom || dateTo || status !== "all") && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                Reset
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

      {/* ----------------- REPORTS TABLE ----------------- */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <Loading01 />
          </div>
        ) : reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Business Date</th>
                  {isFederalOversight && <th className="py-3.5 px-4 font-semibold">Purchasing Center</th>}
                  <th className="py-3.5 px-4 font-semibold">Transactions</th>
                  <th className="py-3.5 px-4 font-semibold">Canonical Gold (g)</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted By & At</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => {
                  const dailyReportUrl = isFederalOversight
                    ? `/admin/gold-operations/reports?date=${r.business_date}`
                    : `${basePath}/reports/daily?date=${r.business_date}`;

                  return (
                    <tr key={r.report_id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {r.business_date}
                      </td>
                      {isFederalOversight && (
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {r.purchasingCenter?.name || "Purchasing Center"}
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-mono">
                        {r.total_purchases}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {parseFloat(String(r.total_quantity_canonical)).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}{" "}
                        g
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                        {parseFloat(String(r.total_amount)).toLocaleString()} ETB
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={r.status === "submitted" || r.status === "reviewed" ? "default" : "outline"}
                          className={
                            r.status === "submitted" || r.status === "reviewed"
                              ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                              : "text-[11px]"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {r.submitted_at ? (
                          <div>
                            <p className="text-foreground">{r.submittedBy?.full_name || "Staff Member"}</p>
                            <p>{new Date(r.submitted_at).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          "Not recorded"
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">
                          <Link href={dailyReportUrl}>
                            <Eye className="h-3.5 w-3.5" /> View Report
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
            <History className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <h3 className="text-base font-semibold text-foreground">No historical reports found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No submitted daily reports match the selected date range or status.
            </p>
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
