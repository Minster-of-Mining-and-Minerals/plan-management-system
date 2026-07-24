"use client";

import { useState } from "react";
import {
  FlaskConical,
  TestTube,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  type ClinicalOrder,
} from "@/redux/api/clinicalOrderApi";
import {
  useCreateSpecimenMutation,
  useCollectSpecimenMutation,
  useUpdateLaboratoryStatusMutation,
  useListTestCatalogQuery,
  type SampleType,
} from "@/redux/api/laboratoryApi";
import { SpecimenLifecyclePanel } from "./SpecimenLifecyclePanel";
import { LaboratoryWorklistPanel } from "./LaboratoryWorklistPanel";

type Props = {
  appointmentId: string;
};

const SAMPLE_TYPES: { value: SampleType; label: string }[] = [
  { value: "BLOOD", label: "Whole Blood / Serum" },
  { value: "URINE", label: "Urine Specimen" },
  { value: "SWAB", label: "Nasopharyngeal / Wound Swab" },
  { value: "CSF", label: "Cerebrospinal Fluid" },
  { value: "STOOL", label: "Stool Sample" },
  { value: "TISSUE", label: "Tissue Biopsy" },
];

export function LaboratoryOrderPanel({ appointmentId }: Props) {
  const { data: orders = [] } = useListEncounterOrdersQuery(appointmentId);
  const labOrders = orders.filter((o) => o.order_type === "LABORATORY");

  const [createSpecimen] = useCreateSpecimenMutation();
  const [collectSpecimen] = useCollectSpecimenMutation();
  const [updateLabStatus] = useUpdateLaboratoryStatusMutation();

  const [selectedOrder, setSelectedOrder] = useState<ClinicalOrder | null>(null);
  const [specimenDialogOpen, setSpecimenDialogOpen] = useState(false);
  const [specimenType, setSpecimenType] = useState<SampleType>("BLOOD");
  const [specimenNotes, setSpecimenNotes] = useState("");

  const handleCreateSpecimen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await createSpecimen({
        orderId: selectedOrder.order_id,
        payload: {
          specimen_type: specimenType,
          notes: specimenNotes.trim() || undefined,
        },
      }).unwrap();

      toast.success("Specimen request created");
      setSpecimenDialogOpen(false);
      setSelectedOrder(null);
      setSpecimenNotes("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create specimen request");
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateLabStatus({
        orderId,
        laboratory_status: newStatus,
      }).unwrap();
      toast.success(`Laboratory status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update lab status");
    }
  };

  if (labOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <LaboratoryWorklistPanel />
      <Card className="my-4 border-l-4 border-l-purple-500">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-purple-500" />
          <CardTitle className="text-base font-semibold">Laboratory Processing & Specimen</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {labOrders.length} Lab Orders
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {labOrders.map((order) => (
          <div
            key={order.order_id}
            className="p-3 border rounded-md bg-purple-50/20 dark:bg-purple-950/10 space-y-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center gap-2">
                <span>{order.title}</span>
                <Badge variant="outline" className="text-xs">
                  Lab Status: {order.laboratory_status || "WAITING_FOR_COLLECTION"}
                </Badge>
              </div>

              <Select
                value={order.laboratory_status || "WAITING_FOR_COLLECTION"}
                onValueChange={(val) => handleStatusChange(order.order_id, val)}
              >
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Update Lab Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAITING_FOR_COLLECTION">WAITING_FOR_COLLECTION</SelectItem>
                  <SelectItem value="SPECIMEN_COLLECTED">SPECIMEN_COLLECTED</SelectItem>
                  <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                  <SelectItem value="RESULT_PENDING">RESULT_PENDING</SelectItem>
                  <SelectItem value="VERIFICATION_PENDING">VERIFICATION_PENDING</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TestTube className="h-4 w-4 text-purple-500" />
                <span>Priority: {order.priority}</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => {
                  setSelectedOrder(order);
                  setSpecimenDialogOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Specimen Request
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Add Specimen Dialog */}
      <Dialog open={specimenDialogOpen} onOpenChange={setSpecimenDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSpecimen}>
            <DialogHeader>
              <DialogTitle>Request Specimen Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm font-medium">{selectedOrder?.title}</p>

              <div className="space-y-2">
                <Label>Sample Type</Label>
                <Select
                  value={specimenType}
                  onValueChange={(val: SampleType) => setSpecimenType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Collection Instructions / Notes</Label>
                <Input
                  placeholder="e.g. Fasting sample required, draw 5mL in EDTA tube"
                  value={specimenNotes}
                  onChange={(e) => setSpecimenNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSpecimenDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Specimen Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}
