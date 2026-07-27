"use client";

import React, { useState, useEffect } from "react";
import { ClipboardList, Plus, Trash2, CheckCircle, AlertCircle, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useGetCarePlanQuery,
  useUpsertCarePlanMutation,
} from "@/redux/api/medicalWorkflowApi";

export interface CarePlanCardProps {
  appointmentId: string;
}

export function CarePlanCard({ appointmentId }: CarePlanCardProps) {
  const { data: carePlan, isLoading, refetch } = useGetCarePlanQuery(appointmentId);
  const [upsertCarePlan, { isLoading: isSaving }] = useUpsertCarePlanMutation();

  const [title, setTitle] = useState("Outpatient Care Plan");
  const [patientInstructions, setPatientInstructions] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [interventions, setInterventions] = useState<string[]>([]);
  const [newIntervention, setNewIntervention] = useState("");

  useEffect(() => {
    if (carePlan) {
      setTitle(carePlan.title || "Outpatient Care Plan");
      setPatientInstructions(carePlan.patient_instructions || "");
      setGoals(Array.isArray(carePlan.goals) ? carePlan.goals : []);
      setInterventions(Array.isArray(carePlan.interventions) ? carePlan.interventions : []);
    }
  }, [carePlan]);

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const handleRemoveGoal = (idx: number) => {
    setGoals(goals.filter((_, i) => i !== idx));
  };

  const handleAddIntervention = () => {
    if (newIntervention.trim()) {
      setInterventions([...interventions, newIntervention.trim()]);
      setNewIntervention("");
    }
  };

  const handleRemoveIntervention = (idx: number) => {
    setInterventions(interventions.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      await upsertCarePlan({
        appointmentId,
        payload: {
          title,
          goals,
          interventions,
          patient_instructions: patientInstructions,
          status: "ACTIVE",
        },
      }).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to save care plan:", err);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 flex justify-center items-center">
        <p className="text-sm text-muted-foreground">Loading care plan...</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="pb-3 border-b bg-muted/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Clinical Care Plan (NOF v2.6)</CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold">
            {carePlan?.status || "DRAFT"}
          </Badge>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Care Plan"}
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Care Plan Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Outpatient Diabetes Management Plan" />
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Clinical Goals</label>
          <div className="space-y-1.5">
            {goals.map((g, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted/40 p-2 rounded text-sm border">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {g}
                </span>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveGoal(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Add new goal (e.g. Reduce HbA1c < 7.0%)"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddGoal())}
            />
            <Button size="sm" variant="secondary" onClick={handleAddGoal}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Interventions */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Clinical Interventions</label>
          <div className="space-y-1.5">
            {interventions.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-muted/40 p-2 rounded text-sm border">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                  {item}
                </span>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveIntervention(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newIntervention}
              onChange={(e) => setNewIntervention(e.target.value)}
              placeholder="Add intervention (e.g. Nutritional counseling)"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddIntervention())}
            />
            <Button size="sm" variant="secondary" onClick={handleAddIntervention}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Patient Instructions */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Patient Instructions & Advice</label>
          <Textarea
            value={patientInstructions}
            onChange={(e) => setPatientInstructions(e.target.value)}
            rows={3}
            placeholder="Direct instructions given to patient for home care..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
