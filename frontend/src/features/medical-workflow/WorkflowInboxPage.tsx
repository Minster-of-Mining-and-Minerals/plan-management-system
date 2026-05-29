"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import DetailHeader from "@/components/common/DetailHeader";
import { WorkflowInboxTable } from "./WorkflowInboxTable";

export default function WorkflowInboxPage() {
  const [status, setStatus] = useState("pending");

  return (
    <div className="space-y-6">
      <DetailHeader breadcrumbs={[{ title: "Workflow inbox" }]} />

      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Inbox className="h-6 w-6 text-primary" />
          Workflow inbox
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Incoming forwarded patients and pending workflow tasks
        </p>
      </div>

      <WorkflowInboxTable status={status} onStatusChange={setStatus} />
    </div>
  );
}
