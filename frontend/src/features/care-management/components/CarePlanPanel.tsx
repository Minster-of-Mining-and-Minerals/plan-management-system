"use client";

import { ClipboardList, Plus, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetPatientPlansQuery, useCreateCarePlanMutation, useUpdateCarePlanStatusMutation, type CarePlan } from "@/redux/api/careManagementApi";

type Props = { patientId: string; onSelectPlan?: (planId: string) => void };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-400 text-white",
  ACTIVE: "bg-emerald-600 text-white",
  ON_HOLD: "bg-amber-500 text-white",
  COMPLETED: "bg-blue-600 text-white",
  CANCELLED: "bg-red-500 text-white",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-300 text-slate-800",
  MEDIUM: "bg-yellow-400 text-black",
  HIGH: "bg-orange-500 text-white",
  CRITICAL: "bg-red-600 text-white",
};

export function CarePlanPanel({ patientId, onSelectPlan }: Props) {
  const { data: plans = [], isLoading } = useGetPatientPlansQuery(patientId);
  const [createPlan, { isLoading: isCreating }] = useCreateCarePlanMutation();
  const [updateStatus] = useUpdateCarePlanStatusMutation();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createPlan({ patient_id: patientId, title: newTitle, priority: newPriority });
    setNewTitle("");
    setShowAdd(false);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b flex flex-row items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">Clinical Care Plans ({plans.length})</CardTitle>
        </div>
        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> New Plan
        </Button>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2">
        {showAdd && (
          <div className="flex gap-2 p-2 border rounded bg-slate-50/50 items-center">
            <Input className="h-7 text-xs flex-1" placeholder="Care plan title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <select className="h-7 text-xs border rounded px-1" value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button size="sm" className="h-7 text-[10px]" disabled={isCreating} onClick={handleCreate}>Create</Button>
          </div>
        )}

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading care plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No care plans on record.</div>
        ) : (
          plans.map((plan: CarePlan) => (
            <div key={plan.plan_id} className="p-3 border rounded hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[9px] ${STATUS_COLORS[plan.status]}`}>{plan.status}</Badge>
                    <Badge className={`text-[9px] ${PRIORITY_COLORS[plan.priority]}`}>{plan.priority}</Badge>
                    <span className="font-semibold text-[12px]">{plan.title}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {plan.goals?.length || 0} goals · {plan.careTeam?.length || 0} care team members
                    {plan.target_end_date && ` · Target: ${plan.target_end_date}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  {plan.status === "DRAFT" && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                      onClick={() => updateStatus({ planId: plan.plan_id, status: "ACTIVE" })}>
                      Activate
                    </Button>
                  )}
                  {onSelectPlan && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => onSelectPlan(plan.plan_id)}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
