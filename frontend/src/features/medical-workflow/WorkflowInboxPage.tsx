"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Inbox, ExternalLink } from "lucide-react";
import DetailHeader from "@/components/common/DetailHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetWorkflowInboxQuery } from "@/redux/api/medicalWorkflowApi";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WorkflowInboxPage() {
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const { data: tasks = [], isLoading } = useGetWorkflowInboxQuery({ status });

  return (
    <div className="space-y-6">
      <DetailHeader
        title="Workflow inbox"
        description="Incoming forwarded patients and pending workflow tasks"
        icon={Inbox}
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter</span>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loading01 />
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tasks in this queue.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => {
            const patient = task.appointment?.patient;
            const schedule = task.appointment?.schedule;
            const header = task.medicalLog?.header_title ?? "Forwarded patient";

            return (
              <Card key={task.task_id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">
                      {header}
                    </CardTitle>
                    <Badge
                      variant={
                        task.status === "pending" ? "default" : "secondary"
                      }
                      className="capitalize shrink-0"
                    >
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(task.created_at)}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {patient?.full_name ?? "Patient"}
                    </p>
                    {patient?.patientProfile?.patient_code && (
                      <p className="text-xs text-muted-foreground">
                        {patient.patientProfile.patient_code}
                      </p>
                    )}
                  </div>
                  {task.assignedBy && (
                    <p className="text-muted-foreground">
                      From:{" "}
                      <span className="text-foreground">
                        {task.assignedBy.full_name}
                      </span>
                    </p>
                  )}
                  {schedule && (
                    <p className="text-xs text-muted-foreground">
                      Visit: {schedule.schedule_date}{" "}
                      {schedule.start_time?.slice(0, 5)}
                    </p>
                  )}
                  <Button
                    className="mt-auto w-full"
                    size="sm"
                    onClick={() =>
                      router.push(`/appointments/${task.appointment_id}`)
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open appointment
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
