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
import { Copy, Loader2 } from "lucide-react";
import { useDuplicateShortTermPlanMutation } from "@/redux/api/shortTermPlanApi";
import type { ShortTermPlan } from "@/redux/types/shortTermPlan";
import { toast } from "sonner";

interface DuplicateShortTermPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ShortTermPlan | null;
  onDuplicated?: (newPlan: ShortTermPlan) => void;
}

export function DuplicateShortTermPlanModal({
  isOpen,
  onClose,
  plan,
  onDuplicated,
}: DuplicateShortTermPlanModalProps) {
  const [duplicatePlan, { isLoading }] = useDuplicateShortTermPlanMutation();
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (isOpen && plan) {
      setTitle(`Copy of ${plan.title}`);
    }
  }, [isOpen, plan]);

  if (!plan) return null;

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Plan title is required");
      return;
    }

    try {
      const res = await duplicatePlan({
        planId: plan.short_term_plan_id,
        data: { title: trimmed },
      }).unwrap();

      toast.success(
        "Short-term plan duplicated successfully. All KPIs, targets, and assignments were copied without reports."
      );
      onClose();
      if (onDuplicated) {
        onDuplicated(res);
      }
    } catch (err: any) {
      console.error("Duplicate plan error:", err);
      toast.error(err?.data?.message || "Failed to duplicate short-term plan");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-emerald-600" />
            Duplicate Short-Term Plan Draft
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleDuplicate} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">New Plan Draft Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Copy of Q2 100-Day Performance Plan"
              required
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              All <strong>{plan.stats?.kpi_count || plan.kpis?.length || 0} KPIs</strong> and their assigned sectors, departments, and personnel target breakdowns will be duplicated. Reporting submissions will be fresh.
            </p>
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
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
