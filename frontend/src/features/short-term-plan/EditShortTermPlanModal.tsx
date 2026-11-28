"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DualCalendarDatePicker } from "@/components/ui/dual-calendar-date-picker";
import { useUpdateShortTermPlanMutation } from "@/redux/api/shortTermPlanApi";
import type { ShortTermPlan } from "@/redux/types/shortTermPlan";
import { Edit, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface EditShortTermPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ShortTermPlan | null;
  sectors: Array<{ government_structure_id: string; name: string }>;
  configurations: Array<{ configuration_id: string; title: string }>;
}

export function EditShortTermPlanModal({
  isOpen,
  onClose,
  plan,
  sectors,
  configurations,
}: EditShortTermPlanModalProps) {
  const [updatePlan, { isLoading }] = useUpdateShortTermPlanMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sectorId, setSectorId] = useState<string>("none");
  const [configId, setConfigId] = useState<string>("none");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationDays, setDurationDays] = useState<number>(100);
  const [status, setStatus] = useState<string>("active");

  useEffect(() => {
    if (isOpen && plan) {
      setTitle(plan.title);
      setDescription(plan.description || "");
      setSectorId(plan.government_structure_id || "none");
      setConfigId(plan.configuration_id || "none");
      setStartDate(plan.start_date || "");
      setEndDate(plan.end_date || "");
      setDurationDays(plan.duration_days || 100);
      setStatus(plan.status || "active");
    }
  }, [isOpen, plan]);

  if (!plan) return null;

  // Auto-sync duration and dates
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart && durationDays > 0) {
      const d = new Date(newStart);
      d.setDate(d.getDate() + Number(durationDays));
      setEndDate(d.toISOString().split("T")[0]);
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (startDate && newEnd) {
      const diffMs = new Date(newEnd).getTime() - new Date(startDate).getTime();
      const diff = Math.round(diffMs / 86400000);
      if (diff > 0) {
        setDurationDays(diff);
      }
    }
  };

  const handleDurationChange = (days: number) => {
    setDurationDays(days);
    if (startDate && days > 0) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + Number(days));
      setEndDate(d.toISOString().split("T")[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Plan title is required");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start Date and End Date are required");
      return;
    }

    try {
      await updatePlan({
        planId: plan.short_term_plan_id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          government_structure_id: sectorId !== "none" ? sectorId : null,
          configuration_id: configId !== "none" ? configId : null,
          start_date: startDate,
          end_date: endDate,
          duration_days: durationDays,
          status,
        },
      }).unwrap();

      toast.success("Short-term plan updated successfully");
      onClose();
    } catch (err: any) {
      console.error("Update plan error:", err);
      toast.error(err?.data?.message || "Failed to update short-term plan");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-emerald-600" />
            Edit Short-Term Plan Draft
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Plan Draft Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 100-Day Performance Action Plan"
              required
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mother Sector (Governing Sector)</Label>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select Sector..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sector Constraint</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duration (Days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Date range picker with auto-sync */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Start Date (From) *
              </Label>
              <DualCalendarDatePicker
                value={startDate}
                onChange={handleStartDateChange}
                calendarSystem={plan.calendar_system || "EC"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                End Date (To) *
              </Label>
              <DualCalendarDatePicker
                value={endDate}
                onChange={handleEndDateChange}
                calendarSystem={plan.calendar_system || "EC"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational objectives or executive notes..."
              className="text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
