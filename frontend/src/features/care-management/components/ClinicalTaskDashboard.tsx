"use client";

import { CheckSquare, Clock, Zap, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetPatientTasksQuery, useAcceptTaskMutation, useCompleteTaskMutation, type ClinicalTask } from "@/redux/api/careManagementApi";

type Props = { patientId: string };

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-slate-400 text-white",
  ACCEPTED: "bg-blue-500 text-white",
  COMPLETED: "bg-emerald-600 text-white",
  OVERDUE: "bg-red-600 text-white",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-300 text-slate-800",
  MEDIUM: "bg-yellow-400 text-black",
  HIGH: "bg-orange-500 text-white",
  CRITICAL: "bg-red-600 text-white",
};

export function ClinicalTaskDashboard({ patientId }: Props) {
  const { data: tasks = [], isLoading } = useGetPatientTasksQuery({ patientId });
  const [acceptTask] = useAcceptTaskMutation();
  const [completeTask] = useCompleteTaskMutation();

  const openTasks = tasks.filter((t) => t.status === "OPEN");
  const acceptedTasks = tasks.filter((t) => t.status === "ACCEPTED");
  const overdueTasks = tasks.filter((t) => t.status === "OVERDUE");

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">Clinical Task Dashboard</CardTitle>
          <div className="flex gap-1.5 ml-auto">
            {overdueTasks.length > 0 && <Badge className="bg-red-600 text-white text-[9px]">{overdueTasks.length} Overdue</Badge>}
            <Badge variant="outline" className="text-[9px]">{openTasks.length} Open</Badge>
            <Badge variant="outline" className="text-[9px]">{acceptedTasks.length} In Progress</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 text-xs divide-y">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground animate-pulse">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No clinical tasks found.</div>
        ) : (
          tasks.map((task: ClinicalTask) => (
            <div key={task.task_id} className={`p-3 hover:bg-slate-50/50 space-y-2 ${task.status === "OVERDUE" ? "bg-red-50/30" : ""}`}>
              <div className="flex items-start gap-2 justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[9px] ${STATUS_COLORS[task.status]}`}>{task.status}</Badge>
                    <Badge className={`text-[9px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                    <span className="font-semibold text-[11px]">{task.title}</span>
                  </div>
                  {task.description && <p className="text-[10px] text-muted-foreground">{task.description}</p>}
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                    {task.assignee && <span>Assigned to: {task.assignee.full_name}</span>}
                    {task.due_date && (
                      <span className={`flex items-center gap-0.5 ${task.status === "OVERDUE" ? "text-red-500 font-medium" : ""}`}>
                        <Clock className="h-2.5 w-2.5" />
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(task.status === "OPEN" || task.status === "ACCEPTED") && (
                <div className="flex gap-1.5">
                  {task.status === "OPEN" && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => acceptTask(task.task_id)}>
                      <Zap className="h-3 w-3 mr-1" /> Accept
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-emerald-600" onClick={() => completeTask(task.task_id)}>
                    <CheckSquare className="h-3 w-3 mr-1" /> Complete
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
