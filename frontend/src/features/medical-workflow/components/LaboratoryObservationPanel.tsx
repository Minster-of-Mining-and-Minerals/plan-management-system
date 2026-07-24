"use client";

import { useState } from "react";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Edit3,
  Plus,
  History,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useGetObservationsQuery,
  useCreateObservationMutation,
  useVerifyObservationMutation,
  useAmendObservationMutation,
  type AbnormalFlag,
  type LaboratoryObservation,
} from "@/redux/api/laboratoryApi";

type Props = {
  resultId: string;
  orderId: string;
};

const FLAG_BADGES: Record<AbnormalFlag, { label: string; className: string }> = {
  NORMAL: { label: "NORMAL", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  LOW: { label: "LOW ↓", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  HIGH: { label: "HIGH ↑", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  CRITICAL_LOW: { label: "CRITICAL LOW ⚠️", className: "bg-red-500 text-white animate-pulse" },
  CRITICAL_HIGH: { label: "CRITICAL HIGH 🚨", className: "bg-red-600 text-white animate-pulse" },
};

export function LaboratoryObservationPanel({ resultId, orderId }: Props) {
  const { data: observations = [], isLoading } = useGetObservationsQuery(resultId);

  const [createObservation] = useCreateObservationMutation();
  const [verifyObservation] = useVerifyObservationMutation();
  const [amendObservation] = useAmendObservationMutation();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [lowRange, setLowRange] = useState("");
  const [highRange, setHighRange] = useState("");

  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [selectedObs, setSelectedObs] = useState<LaboratoryObservation | null>(null);
  const [amendValue, setAmendValue] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || value === "") {
      toast.error("Code, Name, and Value are required");
      return;
    }

    try {
      await createObservation({
        resultId,
        payload: {
          order_id: orderId,
          observation_code: code.trim(),
          observation_name: name.trim(),
          value: value.trim(),
          unit: unit.trim() || undefined,
          reference_range: {
            low: lowRange ? Number(lowRange) : undefined,
            high: highRange ? Number(highRange) : undefined,
          },
        },
      }).unwrap();

      toast.success("Structured observation analyte added");
      setAddDialogOpen(false);
      setCode("");
      setName("");
      setValue("");
      setUnit("");
      setLowRange("");
      setHighRange("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add observation analyte");
    }
  };

  const handleVerify = async (obsId: string) => {
    try {
      await verifyObservation({ observationId: obsId, resultId }).unwrap();
      toast.success("Observation analyte result verified");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to verify observation");
    }
  };

  const handleAmendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObs || !changeReason.trim()) {
      toast.error("Amendment change reason is required");
      return;
    }

    try {
      await amendObservation({
        observationId: selectedObs.id,
        resultId,
        payload: {
          value: amendValue.trim() || selectedObs.value,
          change_reason: changeReason.trim(),
        },
      }).unwrap();

      toast.success("Observation analyte result amended");
      setAmendDialogOpen(false);
      setSelectedObs(null);
      setAmendValue("");
      setChangeReason("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to amend observation");
    }
  };

  return (
    <Card className="my-3 border border-indigo-200 dark:border-indigo-900 bg-indigo-50/10">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">Structured Analyte Observations</CardTitle>
          <Badge variant="outline" className="ml-1 text-[11px]">
            {observations.length} Analytes
          </Badge>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Analyte Result
        </Button>
      </CardHeader>

      <CardContent className="space-y-2 pt-0 text-xs">
        {isLoading ? (
          <div className="text-muted-foreground text-xs py-2">Loading structured analytes...</div>
        ) : observations.length === 0 ? (
          <div className="text-muted-foreground text-xs py-3 text-center border rounded bg-background">
            No structured analyte observations recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {observations.map((obs) => {
              const flagInfo = FLAG_BADGES[obs.abnormal_flag] || FLAG_BADGES.NORMAL;
              const isCritical =
                obs.abnormal_flag === "CRITICAL_LOW" || obs.abnormal_flag === "CRITICAL_HIGH";

              return (
                <div
                  key={obs.id}
                  className={`p-2.5 border rounded flex items-center justify-between ${
                    isCritical
                      ? "border-red-500 bg-red-50/30 dark:bg-red-950/20"
                      : "bg-background"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                      <span>{obs.observation_name}</span>
                      <span className="text-muted-foreground font-normal">({obs.observation_code})</span>
                      <Badge className={flagInfo.className}>{flagInfo.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {obs.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Value: {obs.value} {obs.unit || ""}
                      </span>
                      {obs.reference_range && (
                        <span>
                          Ref: {obs.reference_range.low ?? "N/A"} - {obs.reference_range.high ?? "N/A"}
                        </span>
                      )}
                      {obs.verifiedByUser && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Verified by {obs.verifiedByUser.full_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {obs.status !== "FINAL" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px]"
                        onClick={() => handleVerify(obs.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Verify
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px]"
                      onClick={() => {
                        setSelectedObs(obs);
                        setAmendValue(obs.value);
                        setAmendDialogOpen(true);
                      }}
                    >
                      <Edit3 className="h-3 w-3 mr-1" /> Amend
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Observation Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Add Structured Analyte Observation</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-3 text-xs">
              <div className="space-y-1">
                <Label>Analyte Code (e.g., WBC)</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WBC" />
              </div>
              <div className="space-y-1">
                <Label>Analyte Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="White Blood Cell Count" />
              </div>
              <div className="space-y-1">
                <Label>Observed Value</Label>
                <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="7.5" />
              </div>
              <div className="space-y-1">
                <Label>Unit (e.g., g/dL)</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="10^3/uL" />
              </div>
              <div className="space-y-1">
                <Label>Reference Range Low</Label>
                <Input value={lowRange} onChange={(e) => setLowRange(e.target.value)} placeholder="4.0" />
              </div>
              <div className="space-y-1">
                <Label>Reference Range High</Label>
                <Input value={highRange} onChange={(e) => setHighRange(e.target.value)} placeholder="10.0" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Analyte Observation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Amend Dialog */}
      <Dialog open={amendDialogOpen} onOpenChange={setAmendDialogOpen}>
        <DialogContent>
          <form onSubmit={handleAmendSubmit}>
            <DialogHeader>
              <DialogTitle>Amend Analyte Result — {selectedObs?.observation_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <Label>New Value</Label>
                <Input value={amendValue} onChange={(e) => setAmendValue(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Mandatory Change Reason</Label>
                <Input
                  placeholder="e.g. Analyzer re-run result corrected"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAmendDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Save Amendment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
