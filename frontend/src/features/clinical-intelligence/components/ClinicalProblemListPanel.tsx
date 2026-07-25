"use client";

import { ClipboardList, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetPatientProblemsQuery,
  useAddClinicalProblemMutation,
  useResolveClinicalProblemMutation,
} from "@/redux/api/clinicalIntelligenceApi";

type Props = { patientId: string };

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-400 text-black",
  LOW: "bg-emerald-500 text-white",
};

export function ClinicalProblemListPanel({ patientId }: Props) {
  const { data: problems = [], isLoading } = useGetPatientProblemsQuery({ patientId });
  const [addProblem, { isLoading: isAdding }] = useAddClinicalProblemMutation();
  const [resolveProblem] = useResolveClinicalProblemMutation();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSeverity, setNewSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addProblem({ patient_id: patientId, problem_name: newName, severity: newSeverity });
    setNewName("");
    setShowAdd(false);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b flex flex-row items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">
            Problem List ({problems.filter((p) => p.status === "ACTIVE").length} Active)
          </CardTitle>
        </div>
        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3 mr-1" /> Add Problem
        </Button>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2">
        {showAdd && (
          <div className="flex gap-2 items-center p-2 border rounded bg-slate-50/50">
            <Input
              className="h-7 text-xs flex-1"
              placeholder="Problem name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select
              className="h-7 text-xs border rounded px-1"
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as any)}
            >
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Button size="sm" className="h-7 text-[10px]" disabled={isAdding} onClick={handleAdd}>
              Save
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading problem list...</div>
        ) : problems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No problems on record.</div>
        ) : (
          problems.map((problem) => (
            <div key={problem.problem_id} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] ${SEVERITY_BADGE[problem.severity] || "bg-slate-400 text-white"}`}>
                  {problem.severity}
                </Badge>
                <span className={`font-medium ${problem.status === "RESOLVED" ? "line-through text-muted-foreground" : ""}`}>
                  {problem.problem_name}
                </span>
                {problem.status !== "ACTIVE" && (
                  <Badge variant="outline" className="text-[9px]">{problem.status}</Badge>
                )}
              </div>
              {problem.status === "ACTIVE" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-emerald-600"
                  onClick={() => resolveProblem(problem.problem_id)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
