"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeftRight } from "lucide-react";
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
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS } from "@/utils/planPermissionUtils";
import { useCreateTargetReallocationMutation } from "@/redux/api/planApi";
import type { PlanVersion } from "@/redux/types/plan";

export type TargetReallocationKpiOption = {
  id: string;
  title: string;
};

type TargetReallocationRequestFormProps = {
  draftId: string;
  periods: PlanVersion[];
  kpiOptions: TargetReallocationKpiOption[];
  targetNodeLabel?: string;
  onSubmitted?: () => void;
};

export function TargetReallocationRequestForm({
  draftId,
  periods,
  kpiOptions,
  targetNodeLabel = "KPI",
  onSubmitted,
}: TargetReallocationRequestFormProps) {
  const [kpiId, setKpiId] = useState("");
  const [fromPeriodId, setFromPeriodId] = useState("");
  const [toPeriodId, setToPeriodId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [createRequest, { isLoading }] = useCreateTargetReallocationMutation();

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort(
        (a, b) => (a.sequence_index ?? 0) - (b.sequence_index ?? 0)
      ),
    [periods]
  );

  const resetForm = () => {
    setKpiId("");
    setFromPeriodId("");
    setToPeriodId("");
    setAmount("");
    setReason("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const numericAmount = Number(amount);
    if (!kpiId || !fromPeriodId || !toPeriodId) {
      actionFeedback.error(
        `Select ${targetNodeLabel}, source period, and destination period`
      );
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      actionFeedback.error("Reallocation amount must be greater than zero.");
      return;
    }
    if (fromPeriodId === toPeriodId) {
      actionFeedback.error("Source and destination periods must be different.");
      return;
    }
    if (!reason.trim()) {
      actionFeedback.error("Reason is required");
      return;
    }

    try {
      await createRequest({
        draftId,
        kpiId,
        fromPeriodId,
        toPeriodId,
        amount: numericAmount,
        reason: reason.trim(),
      }).unwrap();
      actionFeedback.success("Target reallocation request submitted");
      resetForm();
      onSubmitted?.();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(
        err.data?.message || "Failed to submit target reallocation request"
      );
    }
  };

  if (kpiOptions.length === 0 || sortedPeriods.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        At least one {targetNodeLabel} and two execution periods are required to
        request a target reallocation.
      </p>
    );
  }

  return (
    <PermissionGuard requireAll={PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reallocation-kpi">{targetNodeLabel}</Label>
            <Select value={kpiId} onValueChange={setKpiId}>
              <SelectTrigger id="reallocation-kpi" className="w-full">
                <SelectValue placeholder={`Select ${targetNodeLabel}`} />
              </SelectTrigger>
              <SelectContent>
                {kpiOptions.map((kpi) => (
                  <SelectItem key={kpi.id} value={kpi.id}>
                    {kpi.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reallocation-from">Source period</Label>
            <Select value={fromPeriodId} onValueChange={setFromPeriodId}>
              <SelectTrigger id="reallocation-from" className="w-full">
                <SelectValue placeholder="From period" />
              </SelectTrigger>
              <SelectContent>
                {sortedPeriods.map((period) => (
                  <SelectItem
                    key={period.plan_version_id}
                    value={period.plan_version_id}
                  >
                    {period.period_label ||
                      `Period ${period.sequence_index ?? ""}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reallocation-to">Destination period</Label>
            <Select value={toPeriodId} onValueChange={setToPeriodId}>
              <SelectTrigger id="reallocation-to" className="w-full">
                <SelectValue placeholder="To period" />
              </SelectTrigger>
              <SelectContent>
                {sortedPeriods.map((period) => (
                  <SelectItem
                    key={period.plan_version_id}
                    value={period.plan_version_id}
                  >
                    {period.period_label ||
                      `Period ${period.sequence_index ?? ""}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reallocation-amount">Amount</Label>
            <Input
              id="reallocation-amount"
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reallocation-reason">Reason</Label>
          <Textarea
            id="reallocation-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this target reallocation is needed"
            rows={3}
          />
        </div>

        <Button type="submit" disabled={isLoading} className="gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          {isLoading ? "Submitting…" : "Submit request"}
        </Button>
      </form>
    </PermissionGuard>
  );
}
