"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Coins,
  ArrowLeft,
  Building2,
  HardHat,
  Scale,
  AlertCircle,
  XCircle,
  CheckCircle2,
  User,
  ShieldAlert,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  useGetGoldPurchaseByIdQuery,
  useCancelGoldPurchaseMutation,
} from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface PurchaseDetailViewProps {
  purchaseId: string;
  isFederalOversight?: boolean;
}

export function PurchaseDetailView({
  purchaseId,
  isFederalOversight = false,
}: PurchaseDetailViewProps) {
  const params = useParams<{ id?: string }>();
  const activeCenterId = params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/admin/gold-operations";

  const { can } = usePermissions();

  const { data: purchase, isLoading, isError, refetch } = useGetGoldPurchaseByIdQuery(purchaseId);
  const [cancelPurchase, { isLoading: isCancelling }] = useCancelGoldPurchaseMutation();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (isLoading) {
    return <Loading01 />;
  }

  if (isError || !purchase) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Purchase Record Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested gold purchase record could not be loaded or accessed.
        </p>
        <Button asChild variant="outline">
          <Link href={`${basePath}/purchases`}>Back to Register</Link>
        </Button>
      </div>
    );
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please enter a cancellation reason.");
      return;
    }

    try {
      await cancelPurchase({
        id: purchase.purchase_id,
        reason: cancelReason.trim(),
      }).unwrap();

      toast.success("Gold purchase record cancelled successfully.");
      setIsCancelModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to cancel purchase.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1 mb-1 text-muted-foreground">
            <Link href={`${basePath}/purchases`}>
              <ArrowLeft className="h-4 w-4" /> Back to Register
            </Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
              {purchase.purchase_reference}
            </h1>
            <Badge
              variant={purchase.status === "completed" ? "default" : "destructive"}
              className={
                purchase.status === "completed"
                  ? "bg-emerald-600 text-white gap-1 py-1 px-2.5 text-xs font-semibold"
                  : "gap-1 py-1 px-2.5 text-xs font-semibold"
              }
            >
              {purchase.status === "completed" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" /> Cancelled
                </>
              )}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Recorded on {new Date(purchase.purchase_date).toLocaleString()} • Business Date:{" "}
            <strong>{purchase.business_date}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isFederalOversight && purchase.status === "completed" && can("GOLD_PURCHASES:CANCEL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" /> Cancel Purchase
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* CANCELLATION NOTICE BANNER */}
      {purchase.status === "cancelled" && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-5 w-5" />
            Transaction Cancelled
          </div>
          <p className="text-xs">
            Reason: <strong>{purchase.cancelled_reason}</strong>
          </p>
          <p className="text-[11px] text-destructive/80">
            Cancelled on {purchase.cancelled_at ? new Date(purchase.cancelled_at).toLocaleString() : "N/A"}{" "}
            {purchase.cancelledBy ? `by ${purchase.cancelledBy.full_name}` : ""}
          </p>
        </div>
      )}

      {/* ----------------- DETAILS GRID ----------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SELLER DETAILS CARD */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              {purchase.seller_type === "company" ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <HardHat className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Seller Information</h3>
              <p className="text-xs text-muted-foreground capitalize">
                {purchase.seller_type === "company" ? "Registered Company" : "Artisanal & Small-Scale Miner"}
              </p>
            </div>
          </div>

          <div className="divide-y divide-border text-sm pt-2">
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Seller Name:</span>
              <span className="font-semibold text-foreground text-right">
                {purchase.seller_name_snapshot}
              </span>
            </div>
            {purchase.seller_identifier_snapshot && (
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Identifier / License:</span>
                <span className="font-mono text-foreground">
                  {purchase.seller_identifier_snapshot}
                </span>
              </div>
            )}
            {purchase.seller_type === "asm" && purchase.asmSeller?.phone_number && (
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Contact Phone:</span>
                <span className="font-mono text-foreground">
                  {purchase.asmSeller.phone_number}
                </span>
              </div>
            )}
            {purchase.seller_type === "asm" && purchase.asmSeller?.region && (
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Origin Location:</span>
                <span className="text-foreground">
                  {purchase.asmSeller.region}
                  {purchase.asmSeller.zone_or_woreda ? ` / ${purchase.asmSeller.zone_or_woreda}` : ""}
                </span>
              </div>
            )}
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Registry Reference:</span>
              <Badge variant="outline" className="text-xs font-mono">
                {purchase.seller_type === "company" ? purchase.company_id : purchase.asm_id}
              </Badge>
            </div>
          </div>
        </div>

        {/* PURCHASING CENTER DETAILS */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Purchasing Center</h3>
              <p className="text-xs text-muted-foreground">Operational buying outpost</p>
            </div>
          </div>

          <div className="divide-y divide-border text-sm pt-2">
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Center Name:</span>
              <span className="font-semibold text-foreground">
                {purchase.purchasingCenter?.name || "Purchasing Center"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Center Code:</span>
              <span className="font-mono text-foreground font-semibold">
                {purchase.purchasingCenter?.code || "N/A"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Recorded By:</span>
              <span className="text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {purchase.createdBy?.full_name || "Staff Member"}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-mono font-bold text-foreground">{purchase.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- GOLD WEIGHT & FINANCIAL BREAKDOWN ----------------- */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-500" />
          Measured Weight & Financial Settlement
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Recorded Quantity</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {parseFloat(String(purchase.quantity)).toLocaleString()}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {purchase.unit_code_snapshot}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Unit: {purchase.measurementUnit?.name || purchase.unit_code_snapshot}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Canonical Standard Base</p>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {parseFloat(String(purchase.quantity_in_canonical_unit)).toLocaleString()} g
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Factor: 1 {purchase.unit_code_snapshot} = {purchase.conversion_factor_snapshot}g
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Rate / Unit</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {parseFloat(String(purchase.unit_price)).toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              ETB per {purchase.unit_code_snapshot}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Total Purchase Value</p>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {parseFloat(String(purchase.total_amount)).toLocaleString()} ETB
            </p>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              Server-verified disbursement
            </p>
          </div>
        </div>

        {purchase.notes && (
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1">
            <p className="text-xs font-semibold text-foreground">Operational Notes / Assay Remarks</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{purchase.notes}</p>
          </div>
        )}
      </div>

      {/* ----------------- CANCELLATION MODAL ----------------- */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cancel Gold Purchase Record
            </DialogTitle>
            <DialogDescription>
              Cancelling a recorded gold purchase marks the transaction as void for daily reporting and cumulative totals. An explicit audit reason is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label className="text-xs font-semibold">Cancellation Reason *</Label>
            <Textarea
              required
              rows={3}
              placeholder="e.g. Weighing entry error, seller assay dispute, incorrect unit selection..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Purchase
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
