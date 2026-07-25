"use client";

import { useState } from "react";
import {
  Pill,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  FileText,
  ShieldCheck,
  Check,
  PackageCheck,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useGetPharmacyOrderStatusQuery,
  useGetPharmacyClinicalResultQuery,
  useForwardPrescriptionMutation,
  type PharmacyDispensingStatus,
} from "@/redux/api/pharmacyClinicalApi";
import { useGetActivePharmaciesQuery } from "@/redux/api/pharmacyApi";

type Props = {
  orderId: string;
  patientId?: string;
};

const DISPENSING_STATUS_BADGES: Record<PharmacyDispensingStatus, { label: string; className: string }> = {
  PENDING_FORWARD: { label: "Pending Forward ⏳", className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
  FORWARDED: { label: "Forwarded 📤", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  RECEIVED: { label: "Received by Pharmacy 📥", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" },
  REVIEWING: { label: "Pharmacist Review 🔍", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  PREPARING: { label: "Preparing Medication 💊", className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 animate-pulse" },
  WAITING_DOCTOR_APPROVAL: { label: "Waiting Doctor Approval 🚨", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold animate-pulse" },
  SUBSTITUTION_REQUIRED: { label: "Substitution Proposed ⚠️", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 font-bold" },
  PARTIALLY_DISPENSED: { label: "Partially Dispensed 📦", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  DISPENSED: { label: "Dispensed ✅", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  COMPLETED: { label: "Fulfillment Completed ✨", className: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 font-bold" },
  CANCELLED: { label: "Cancelled ❌", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  UNAVAILABLE: { label: "Medication Unavailable ⚠️", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  REJECTED: { label: "Rejected by Pharmacy 🚫", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

const WORKFLOW_STEPS: Array<{ key: string; label: string }> = [
  { key: "SUBMITTED", label: "Prescription Created" },
  { key: "FORWARDED", label: "Sent to Pharmacy" },
  { key: "RECEIVED", label: "Pharmacy Received" },
  { key: "PREPARING", label: "Preparing" },
  { key: "COMPLETED", label: "Dispensed & Completed" },
];

export function PharmacyOrderPanel({ orderId }: Props) {
  const { data: order, isLoading, refetch } = useGetPharmacyOrderStatusQuery(orderId);
  const { data: clinicalResult } = useGetPharmacyClinicalResultQuery(orderId);
  const { data: pharmacies = [] } = useGetActivePharmaciesQuery();
  const [forwardPrescription, { isLoading: isForwarding }] = useForwardPrescriptionMutation();

  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>("");

  const handleForwardSubmit = async () => {
    if (!selectedPharmacyId) {
      toast.error("Please select a target pharmacy");
      return;
    }
    try {
      await forwardPrescription({ orderId, pharmacy_id: selectedPharmacyId }).unwrap();
      toast.success("Prescription order forwarded to pharmacy!");
      setIsForwardDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to forward prescription to pharmacy");
    }
  };

  if (isLoading) {
    return (
      <Card className="my-4 border border-emerald-100 dark:border-emerald-900">
        <CardContent className="py-6 text-center text-xs text-muted-foreground">
          Loading Pharmacy Clinical Order Details...
        </CardContent>
      </Card>
    );
  }

  if (!order) {
    return null;
  }

  const badgeConfig = DISPENSING_STATUS_BADGES[order.pharmacy_status || "PENDING_FORWARD"] || {
    label: order.pharmacy_status || "PENDING_FORWARD",
    className: "bg-slate-100 text-slate-800",
  };

  const items = order.order_items || [];
  const currentStep = order.status === "COMPLETED" ? 4 : order.status === "IN_PROGRESS" ? (order.pharmacy_status === "FORWARDED" ? 1 : 2) : 0;

  return (
    <Card className="my-4 border border-emerald-200 dark:border-emerald-900 bg-background shadow-sm">
      <CardHeader className="py-3 bg-emerald-50/40 dark:bg-emerald-950/20 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Pharmacy Clinical Order & Dispensing
            <span className="text-xs font-mono font-normal text-muted-foreground">
              (Order ID: #{order.order_id.slice(0, 8)})
            </span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${badgeConfig.className}`}>
            {badgeConfig.label}
          </Badge>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-3 text-xs">
        {/* Step Progress Bar */}
        <div className="p-3 rounded-lg border bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between text-[11px]">
            {WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1 text-center">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-semibold text-xs ${
                      isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </div>
                  <span className={`text-[10px] ${isCompleted ? "font-medium text-emerald-900 dark:text-emerald-300" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prescription Title & Doctor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-slate-50 dark:bg-slate-900">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-emerald-600" />
              {order.title}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Prescribed by: <strong>{order.orderedByUser?.full_name || "Clinician"}</strong> | Date: {new Date(order.created_at).toLocaleString()}
            </div>
          </div>
          {order.pharmacy_status === "PENDING_FORWARD" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
              onClick={() => setIsForwardDialogOpen(true)}
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Forward to Pharmacy
            </Button>
          )}
        </div>

        {/* Medication Order Items */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Medication Order Items ({items.length})
          </Label>
          <div className="divide-y border rounded-md overflow-hidden bg-background">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="p-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Dosage: {item.dosage || "N/A"} | Freq: {item.frequency || "N/A"} | Duration: {item.duration || "N/A"}
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  Qty: {item.quantity || "1"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Dispensing Result Display Section */}
        {(clinicalResult || order.result) && (
          <div className="p-3 border border-emerald-300 dark:border-emerald-800 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4 text-emerald-600" />
                Clinical Dispensing Result (Official Record)
              </span>
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {(clinicalResult || order.result)?.verification_status || "FINAL"}
              </Badge>
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300">
              {(clinicalResult || order.result)?.result_summary}
            </div>
            {(clinicalResult || order.result)?.result_data?.medications_dispensed && (
              <div className="mt-2 divide-y border rounded bg-background p-2 text-[11px] space-y-1">
                {(clinicalResult || order.result)?.result_data?.medications_dispensed?.map((m: any, idx: number) => (
                  <div key={idx} className="py-1 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{m.item_name}</span>
                      <span className="text-muted-foreground ml-2">({m.dosage})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400">Dispensed: {m.quantity_dispensed}</span>
                      <Badge variant="outline" className="text-[9px]">{m.status || "dispensed"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground flex items-center gap-3 pt-1">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Verified by: {(clinicalResult || order.result)?.verifiedByUser?.full_name || "Pharmacist"}
              </span>
              <span>Date: {new Date((clinicalResult || order.result)?.recorded_at || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Audit Timeline */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-500" /> Dispensing Audit History
            </Label>
            <div className="space-y-1 border-l-2 border-emerald-500 pl-3 py-1">
              {order.statusHistory.map((hist) => (
                <div key={hist.history_id} className="text-[11px]">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {hist.new_status}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    — {hist.change_reason || "Status updated"} ({new Date(hist.created_at).toLocaleTimeString()})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Forward to Pharmacy Dialog */}
      <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Forward Prescription to Pharmacy
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Select an active hospital or retail pharmacy to receive and dispense this medication order.
            </p>

            <div className="space-y-1.5">
              <label className="font-semibold">Target Pharmacy</label>
              <select
                className="w-full border rounded-md p-2 bg-background text-xs"
                value={selectedPharmacyId}
                onChange={(e) => setSelectedPharmacyId(e.target.value)}
              >
                <option value="">Select Pharmacy...</option>
                {pharmacies.map((pharm) => (
                  <option key={pharm.pharmacy_id} value={pharm.pharmacy_id}>
                    {pharm.pharmacy_name} ({pharm.pharmacy_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsForwardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isForwarding || !selectedPharmacyId}
              onClick={handleForwardSubmit}
            >
              {isForwarding ? "Transmitting..." : "Send Prescription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
