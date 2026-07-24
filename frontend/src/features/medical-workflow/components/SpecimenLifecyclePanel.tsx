"use client";

import { useState } from "react";
import {
  TestTube,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Inbox,
  History,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useCollectSpecimenMutation,
  useReceiveSpecimenMutation,
  useAcceptSpecimenMutation,
  useRejectSpecimenMutation,
  useCreateRecollectionMutation,
  useGetSpecimenHistoryQuery,
  type SpecimenStatus,
} from "@/redux/api/laboratoryApi";

type Props = {
  specimenId: string;
  orderId: string;
};

const STATUS_BADGE_MAP: Record<SpecimenStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_COLLECTION: { label: "Pending Collection", variant: "outline" },
  COLLECTED: { label: "Collected", variant: "secondary" },
  RECEIVED: { label: "Received in Lab", variant: "secondary" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  RECOLLECTION_REQUIRED: { label: "Recollection Required", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export function SpecimenLifecyclePanel({ specimenId }: Props) {
  const { data: specimen, isLoading } = useGetSpecimenHistoryQuery(specimenId);

  const [collectSpecimen] = useCollectSpecimenMutation();
  const [receiveSpecimen] = useReceiveSpecimenMutation();
  const [acceptSpecimen] = useAcceptSpecimenMutation();
  const [rejectSpecimen] = useRejectSpecimenMutation();
  const [createRecollection] = useCreateRecollectionMutation();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  if (isLoading || !specimen) {
    return <div className="text-xs text-muted-foreground py-1">Loading specimen state...</div>;
  }

  const badgeConfig = STATUS_BADGE_MAP[specimen.collection_status] || {
    label: specimen.collection_status,
    variant: "outline",
  };

  const handleCollect = async () => {
    try {
      await collectSpecimen({ specimenId, notes: "Sample collected" }).unwrap();
      toast.success("Specimen marked as collected");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to collect specimen");
    }
  };

  const handleReceive = async () => {
    try {
      await receiveSpecimen(specimenId).unwrap();
      toast.success("Specimen received in laboratory");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to receive specimen");
    }
  };

  const handleAccept = async () => {
    try {
      await acceptSpecimen(specimenId).unwrap();
      toast.success("Specimen accepted for testing");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to accept specimen");
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      await rejectSpecimen({ specimenId, reason: rejectionReason.trim() }).unwrap();
      toast.success("Specimen rejected");
      setRejectDialogOpen(false);
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to reject specimen");
    }
  };

  const handleRecollect = async () => {
    try {
      await createRecollection({ specimenId, notes: "Recollection replacement requested" }).unwrap();
      toast.success("Recollection replacement specimen created");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to request recollection");
    }
  };

  return (
    <div className="p-2 border rounded bg-background space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestTube className="h-4 w-4 text-purple-600" />
          <span className="font-semibold">{specimen.specimen_type} Sample</span>
          <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
          {specimen.parent_specimen_id && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              Replacement Sample
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px]"
          onClick={() => setHistoryDialogOpen(true)}
        >
          <History className="h-3 w-3 mr-1" /> View Lifecycle History
        </Button>
      </div>

      {specimen.notes && <p className="text-muted-foreground text-[11px]">Notes: {specimen.notes}</p>}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {specimen.collection_status === "PENDING_COLLECTION" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCollect}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" /> Collect Sample
          </Button>
        )}

        {specimen.collection_status === "COLLECTED" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleReceive}>
            <Inbox className="h-3.5 w-3.5 mr-1 text-blue-600" /> Receive in Lab
          </Button>
        )}

        {specimen.collection_status === "RECEIVED" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAccept}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" /> Accept Sample
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 hover:text-red-700"
              onClick={() => setRejectDialogOpen(true)}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject Sample
            </Button>
          </>
        )}

        {specimen.collection_status === "REJECTED" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRecollect}>
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-amber-600" /> Request Recollection
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <form onSubmit={handleRejectSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> Reject Specimen Sample
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <Label>Mandatory Rejection Reason</Label>
              <Input
                placeholder="e.g. Hemolyzed sample, Insufficient volume, Wrong tube type"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Specimen Lifecycle Audit Trail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase">Status Transitions</h4>
            {specimen.statusHistory && specimen.statusHistory.length > 0 ? (
              <div className="space-y-2">
                {specimen.statusHistory.map((h) => (
                  <div key={h.specimen_status_history_id} className="p-2 border rounded text-xs space-y-0.5">
                    <div className="flex items-center justify-between font-medium">
                      <span>
                        {h.previous_status || "INITIAL"} → <Badge variant="outline">{h.new_status}</Badge>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    {h.changedByUser && (
                      <p className="text-[11px] text-muted-foreground">Changed by: {h.changedByUser.full_name}</p>
                    )}
                    {h.reason && <p className="text-[11px] italic">Reason: {h.reason}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No transition history recorded.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
