"use client";

import React, { useState, useMemo } from "react";
import { useGetRegionalPlanVersionsQuery } from "@/redux/api/regionalPlanApi";
import { useConfirmRegionalMappingMutation } from "@/redux/api/nationalReportingApi";
import { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarCheck, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment;
  regionId: string;
}

export function RegionalConfirmationModal({
  isOpen,
  onClose,
  assignment,
  regionId,
}: Props) {
  const req = assignment.requirement;
  const mapping = assignment.activeMapping;
  const [selectedPeriodVersionId, setSelectedPeriodVersionId] = useState<string>("");

  const { data: planVersions = [] } = useGetRegionalPlanVersionsQuery(
    { region_id: regionId },
    { skip: !isOpen || !regionId }
  );

  // Filter to execution period versions or open versions
  const periodVersions = useMemo(() => {
    const ep = planVersions.filter((v) => v.version_kind === "execution_period");
    return ep.length > 0 ? ep : planVersions;
  }, [planVersions]);

  const activePeriodId = useMemo(() => {
    if (selectedPeriodVersionId) return selectedPeriodVersionId;
    if (periodVersions.length > 0) {
      return periodVersions[0].regional_plan_version_id;
    }
    return "";
  }, [selectedPeriodVersionId, periodVersions]);

  const [confirmMapping, { isLoading: isConfirming }] = useConfirmRegionalMappingMutation();

  const handleConfirm = async () => {
    if (!mapping) {
      toast.error("No prepared mapping found to confirm");
      return;
    }
    if (!activePeriodId) {
      toast.error("Please select an execution period version");
      return;
    }

    try {
      await confirmMapping({
        regionId,
        mappingId: mapping.mapping_id,
        executionPeriodVersionId: activePeriodId,
      }).unwrap();
      toast.success("Mapping confirmed for active reporting period (Stage B)");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to confirm mapping");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
            Stage B: Confirm Period Mapping
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-xs font-mono font-semibold text-emerald-600">
              {req?.code}
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {req?.title}
            </div>
            <div className="text-xs text-slate-500 pt-0.5">
              Mapped Node: <strong className="text-slate-700 dark:text-slate-300">{mapping?.planNode?.title || "Regional KPI"}</strong>
            </div>
          </div>

          <div>
            <Label htmlFor="period-sel">Executing Period Version *</Label>
            <p className="text-xs text-slate-500 mb-1.5">
              Select the active reporting period version to bind this indicator for publication
            </p>
            <Select
              value={activePeriodId}
              onValueChange={setSelectedPeriodVersionId}
            >
              <SelectTrigger id="period-sel">
                <SelectValue placeholder="Select Execution Period" />
              </SelectTrigger>
              <SelectContent>
                {periodVersions.map((v) => (
                  <SelectItem
                    key={v.regional_plan_version_id}
                    value={v.regional_plan_version_id}
                  >
                    {v.draft_name} {v.period_label ? `(${v.period_label})` : ""} {v.planning_year ? `• Year ${v.planning_year}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isConfirming || !activePeriodId}
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isConfirming ? "Confirming..." : "Confirm Period Mapping"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

