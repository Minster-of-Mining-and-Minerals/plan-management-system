"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Plus,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useListEncounterOrdersQuery,
  useCreateClinicalOrderMutation,
  useRecordOrderResultMutation,
  type OrderType,
  type OrderPriority,
  type ClinicalOrder,
} from "@/redux/api/clinicalOrderApi";

type Props = {
  appointmentId: string;
  patientId: string;
};

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "LABORATORY", label: "Laboratory Test" },
  { value: "RADIOLOGY", label: "Radiology Imaging" },
  { value: "PROCEDURE", label: "Clinical Procedure" },
  { value: "REFERRAL", label: "Specialist Referral" },
  { value: "GENERAL", label: "General Clinical Order" },
];

const PRIORITIES: { value: OrderPriority; label: string }[] = [
  { value: "ROUTINE", label: "Routine" },
  { value: "URGENT", label: "Urgent" },
  { value: "STAT", label: "STAT (Emergency)" },
];

export function ClinicalOrderPanel({ appointmentId, patientId }: Props) {
  const { data: orders = [], isLoading } = useListEncounterOrdersQuery(appointmentId);
  const [createOrder] = useCreateClinicalOrderMutation();
  const [recordResult] = useRecordOrderResultMutation();

  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ClinicalOrder | null>(null);

  // Form State
  const [orderType, setOrderType] = useState<OrderType>("LABORATORY");
  const [priority, setPriority] = useState<OrderPriority>("ROUTINE");
  const [title, setTitle] = useState("");
  const [clinicalReason, setClinicalReason] = useState("");

  // Result State
  const [resultSummary, setResultSummary] = useState("");

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Order title is required");
      return;
    }

    try {
      await createOrder({
        appointment_id: appointmentId,
        patient_id: patientId,
        order_type: orderType,
        priority,
        title: title.trim(),
        clinical_reason: clinicalReason.trim() || undefined,
      }).unwrap();

      toast.success("Clinical order placed successfully");
      setOrderDialogOpen(false);
      setTitle("");
      setClinicalReason("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create order");
    }
  };

  const handleRecordResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !resultSummary.trim()) {
      toast.error("Result summary is required");
      return;
    }

    try {
      await recordResult({
        orderId: selectedOrder.order_id,
        payload: {
          result_summary: resultSummary.trim(),
          verification_status: "FINAL",
        },
      }).unwrap();

      toast.success("Clinical order result recorded");
      setResultDialogOpen(false);
      setSelectedOrder(null);
      setResultSummary("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to record result");
    }
  };

  return (
    <Card className="my-4 border-l-4 border-l-sky-500">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-sky-500" />
          <CardTitle className="text-base font-semibold">Clinical Orders</CardTitle>
          <Badge variant="outline" className="ml-2">
            {orders.length} Orders
          </Badge>
        </div>
        <Button size="sm" onClick={() => setOrderDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Order
        </Button>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-2">Loading clinical orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No clinical orders (laboratory, radiology, procedures) placed for this encounter yet.
          </p>
        ) : (
          orders.map((order) => (
            <div
              key={order.order_id}
              className="p-3 border rounded-md bg-muted/20 space-y-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span>{order.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {order.order_type}
                  </Badge>
                  {order.priority === "STAT" && (
                    <Badge variant="destructive" className="text-xs">
                      STAT
                    </Badge>
                  )}
                </div>
                <Badge
                  variant={
                    order.status === "COMPLETED"
                      ? "default"
                      : order.status === "ACCEPTED"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {order.status}
                </Badge>
              </div>

              {order.clinical_reason && (
                <p className="text-xs text-muted-foreground">{order.clinical_reason}</p>
              )}

              {order.result ? (
                <div className="p-2 border rounded bg-emerald-50/50 dark:bg-emerald-950/30 text-xs space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Result ({order.result.verification_status}):
                  </div>
                  <p className="text-foreground">{order.result.result_summary}</p>
                </div>
              ) : (
                order.status !== "COMPLETED" && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        setSelectedOrder(order);
                        setResultDialogOpen(true);
                      }}
                    >
                      Record Result
                    </Button>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </CardContent>

      {/* New Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateOrder}>
            <DialogHeader>
              <DialogTitle>Place Clinical Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select
                  value={orderType}
                  onValueChange={(val: OrderType) => setOrderType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(val: OrderPriority) => setPriority(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order Title / Test Name</Label>
                <Input
                  placeholder="e.g. Complete Blood Count (CBC), Chest X-Ray PA"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Clinical Indication / Reason</Label>
                <Textarea
                  placeholder="Reason for order..."
                  value={clinicalReason}
                  onChange={(e) => setClinicalReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOrderDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRecordResultSubmit}>
            <DialogHeader>
              <DialogTitle>Record Order Result</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm font-medium">{selectedOrder?.title}</p>
              <div className="space-y-2">
                <Label>Result Summary / Findings</Label>
                <Textarea
                  placeholder="Enter laboratory/imaging findings..."
                  value={resultSummary}
                  onChange={(e) => setResultSummary(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResultDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Result</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
