"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Calendar,
  Coins,
  Scale,
  DollarSign,
  FileCheck2,
  CheckCircle2,
  Clock,
  Building2,
  HardHat,
  Printer,
  Send,
  Eye,
  RefreshCw,
  History,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetGoldDailyReportQuery,
  useSubmitGoldDailyReportMutation,
} from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import { AnalyticsPanel } from "@/features/plan-management/dashboard/components/AnalyticsPanel";

interface DailyReportViewProps {
  centerId?: string;
  isFederalOversight?: boolean;
}

export function DailyReportView({
  centerId,
  isFederalOversight = false,
}: DailyReportViewProps) {
  const params = useParams<{ id?: string }>();
  const activeCenterId = centerId || params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/admin/gold-operations";

  const { can } = usePermissions();

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");

  const {
    data: report,
    isLoading,
    isFetching,
    refetch,
  } = useGetGoldDailyReportQuery(
    {
      purchasing_center_id: activeCenterId,
      business_date: selectedDate,
    },
    { skip: !activeCenterId }
  );

  const [submitReport, { isLoading: isSubmitting }] = useSubmitGoldDailyReportMutation();

  if (isLoading) {
    return <Loading01 />;
  }

  const summary = report?.summary;
  const submission = report?.submission;
  const transactions = report?.transactions || [];

  const handleSubmit = async () => {
    try {
      await submitReport({
        purchasing_center_id: activeCenterId,
        business_date: selectedDate,
        notes: submissionNotes.trim() || undefined,
      }).unwrap();

      toast.success("Daily gold report submitted successfully!");
      setIsSubmitModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to submit daily report.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------- TOP BAR & DATE SELECTOR ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileCheck2 className="h-7 w-7 text-emerald-600" />
            Daily Gold Purchasing Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reconciles itemized purchases, unit totals, and seller attribution for business date:{" "}
            <strong>{selectedDate}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-xs">
            <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 border-none text-xs w-36 shadow-none focus-visible:ring-0"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 h-10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-1.5 h-10">
            <Link href={`${basePath}/reports`}>
              <History className="h-3.5 w-3.5" /> Historical Reports
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 h-10">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* ----------------- DIVERGENCE WARNING BANNER ----------------- */}
      {submission?.is_divergent && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Report Totals Diverged from Current Records</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
              New transactions or cancellations were recorded after this daily report was previously submitted.
              Re-submit the report below to update official submission snapshots.
            </p>
          </div>
          {can("GOLD_REPORTS:SUBMIT") && (
            <Button
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs"
            >
              Re-Submit Report
            </Button>
          )}
        </div>
      )}

      {/* ----------------- STATUS & SUBMIT BAR ----------------- */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              submission?.status === "submitted"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {submission?.status === "submitted" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {submission?.status === "submitted"
                  ? "Report Submitted & Audited"
                  : summary && summary.total_purchases > 0
                  ? "Ready for Submission"
                  : "No Purchases Recorded"}
              </h3>
              <Badge
                variant={submission?.status === "submitted" ? "default" : "outline"}
                className={
                  submission?.status === "submitted"
                    ? "bg-emerald-600 text-white text-[10px]"
                    : "text-[10px]"
                }
              >
                {submission?.status || "unsubmitted"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {submission?.submitted_at
                ? `Submitted on ${new Date(submission.submitted_at).toLocaleString()}${
                    submission.submitted_by ? ` by ${submission.submitted_by.full_name}` : ""
                  }`
                : "Dynamically aggregated from underlying purchasing records."}
            </p>
          </div>
        </div>

        {!isFederalOversight && can("GOLD_REPORTS:SUBMIT") && summary && summary.total_purchases > 0 && (
          <Button
            size="default"
            onClick={() => setIsSubmitModalOpen(true)}
            className="gap-2 font-semibold shadow-sm shrink-0"
          >
            <Send className="h-4 w-4" />
            {submission?.status === "submitted" ? "Update / Re-Submit Report" : "Submit Daily Report"}
          </Button>
        )}
      </div>

      {/* ----------------- DAILY KPI CARDS ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Daily Purchases"
          value={summary?.total_purchases?.toLocaleString() || "0"}
          subtitle={`${summary?.cancelled_purchases_count || 0} cancelled transaction(s)`}
          icon={Coins}
          accent="primary"
        />
        <KpiCard
          title="Standardized Base Gold"
          value={`${(summary?.total_quantity_canonical || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
          subtitle="Canonical grams equivalent"
          icon={Scale}
          accent="success"
        />
        <KpiCard
          title="Total Financial Settlement"
          value={`${(summary?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
          subtitle="Total disbursed to sellers"
          icon={DollarSign}
          accent="warning"
        />
      </div>

      {/* ----------------- BREAKDOWNS ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Breakdown */}
        <AnalyticsPanel
          title="Daily Gold Quantity by Unit"
          description="Exact non-lossy weights recorded per unit"
        >
          {summary?.unit_breakdown && summary.unit_breakdown.length > 0 ? (
            <div className="divide-y divide-border">
              {summary.unit_breakdown.map((u) => (
                <div key={u.code} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
                      {u.symbol}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.purchase_count} purchase{u.purchase_count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold font-mono text-foreground">
                    {u.total_quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{u.symbol}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No purchases recorded for this business date.
            </div>
          )}
        </AnalyticsPanel>

        {/* Seller Breakdown */}
        <AnalyticsPanel
          title="Daily Sourcing Breakdown"
          description="Attribution between corporate companies and artisanal miners"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-foreground">Companies</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {(summary?.seller_breakdown?.company?.total_canonical_quantity || 0).toLocaleString()} g
              </p>
              <p className="text-xs text-muted-foreground">
                {summary?.seller_breakdown?.company?.purchase_count || 0} transactions •{" "}
                {(summary?.seller_breakdown?.company?.total_amount || 0).toLocaleString()} ETB
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">ASM Miners</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">
                {(summary?.seller_breakdown?.asm?.total_canonical_quantity || 0).toLocaleString()} g
              </p>
              <p className="text-xs text-muted-foreground">
                {summary?.seller_breakdown?.asm?.purchase_count || 0} transactions •{" "}
                {(summary?.seller_breakdown?.asm?.total_amount || 0).toLocaleString()} ETB
              </p>
            </div>
          </div>
        </AnalyticsPanel>
      </div>

      {/* ----------------- ITEMIZED TRANSACTIONS TABLE ----------------- */}
      <AnalyticsPanel
        title="Itemized Daily Transactions"
        description={`Every individual purchase recorded for business date ${selectedDate}`}
      >
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Time</th>
                  <th className="py-3 px-4 font-semibold">Seller</th>
                  <th className="py-3 px-4 font-semibold">Recorded Qty</th>
                  <th className="py-3 px-4 font-semibold">Base (g)</th>
                  <th className="py-3 px-4 font-semibold">Total Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t.purchase_id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {t.purchase_reference}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.purchase_date).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {t.seller_type}
                        </Badge>
                        <span className="font-medium text-foreground">{t.seller_name_snapshot}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      {parseFloat(String(t.quantity)).toLocaleString()} {t.unit_code_snapshot}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {parseFloat(String(t.quantity_in_canonical_unit)).toLocaleString()} g
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      {parseFloat(String(t.total_amount)).toLocaleString()} ETB
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={t.status === "completed" ? "default" : "destructive"}
                        className={
                          t.status === "completed"
                            ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                            : "text-[11px]"
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                        <Link href={`${basePath}/purchases/${t.purchase_id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No gold purchase transactions were recorded on {selectedDate}.
          </div>
        )}
      </AnalyticsPanel>

      {/* ----------------- SUBMISSION MODAL ----------------- */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              Submit Daily Gold Report
            </DialogTitle>
            <DialogDescription>
              This snapshot reconciles all purchases recorded on {selectedDate} and submits the verified totals to the federal administration oversight dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm divide-y divide-border">
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Business Date:</span>
              <span className="font-semibold text-foreground">{selectedDate}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Eligible Purchases:</span>
              <span className="font-mono font-bold text-foreground">
                {summary?.total_purchases || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Total Canonical Weight:</span>
              <span className="font-mono font-bold text-amber-600">
                {(summary?.total_quantity_canonical || 0).toLocaleString()} grams
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Total Payout:</span>
              <span className="font-mono font-bold text-emerald-600">
                {(summary?.total_amount || 0).toLocaleString()} ETB
              </span>
            </div>

            <div className="pt-3 space-y-1.5">
              <Label className="text-xs font-semibold">Submission Remarks (Optional)</Label>
              <Textarea
                placeholder="Day's operations summary, vault transfer notes..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
              {isSubmitting ? "Submitting..." : "Confirm & Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
