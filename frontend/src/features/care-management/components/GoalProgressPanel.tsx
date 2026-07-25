"use client";

import { Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useListGoalsQuery, useUpdateGoalProgressMutation, type ClinicalGoal } from "@/redux/api/careManagementApi";

type Props = { planId: string };

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-slate-400 text-white",
  IN_PROGRESS: "bg-blue-500 text-white",
  ACHIEVED: "bg-emerald-600 text-white",
  NOT_ACHIEVED: "bg-red-500 text-white",
};

function ProgressBar({ progress }: { progress: number | null }) {
  const pct = Math.min(Math.max(progress ?? 0, 0), 100);
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function GoalProgressPanel({ planId }: Props) {
  const { data: goals = [], isLoading } = useListGoalsQuery(planId);
  const [updateProgress] = useUpdateGoalProgressMutation();
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");

  const handleUpdate = async (goalId: string) => {
    if (!newValue.trim()) return;
    await updateProgress({ goalId, current_value: parseFloat(newValue) });
    setEditingGoalId(null);
    setNewValue("");
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-semibold">Goal Progress ({goals.length})</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No goals defined for this care plan.</div>
        ) : (
          goals.map((goal: ClinicalGoal) => {
            const progress = goal.baseline_value != null && goal.target_value != null && goal.current_value != null
              ? ((parseFloat(String(goal.current_value)) - parseFloat(String(goal.baseline_value))) /
                 (parseFloat(String(goal.target_value)) - parseFloat(String(goal.baseline_value)))) * 100
              : null;

            return (
              <div key={goal.goal_id} className="p-3 border rounded space-y-2 hover:bg-slate-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] ${STATUS_COLOR[goal.status]}`}>{goal.status}</Badge>
                      {goal.status === "ACHIEVED" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    </div>
                    <p className="font-medium text-[11px]">{goal.description}</p>
                    <div className="text-[10px] text-muted-foreground">
                      Baseline: {goal.baseline_value ?? "N/A"} · Current: {goal.current_value ?? "N/A"} · Target: {goal.target_value ?? "N/A"} {goal.unit || ""}
                    </div>
                  </div>
                </div>

                {progress !== null && <ProgressBar progress={progress} />}

                {editingGoalId === goal.goal_id ? (
                  <div className="flex gap-2">
                    <Input className="h-6 text-[10px] w-24" placeholder="New value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                    <Button size="sm" className="h-6 text-[10px]" onClick={() => handleUpdate(goal.goal_id)}>Update</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingGoalId(null)}>Cancel</Button>
                  </div>
                ) : (
                  goal.status !== "ACHIEVED" && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setEditingGoalId(goal.goal_id)}>
                      <TrendingUp className="h-3 w-3 mr-1" /> Update Progress
                    </Button>
                  )
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
