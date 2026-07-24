"use client";

import { useState } from "react";
import {
  ListOrdered,
  Clock,
  UserCheck,
  Play,
  CheckCircle2,
  AlertOctagon,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useGetWorkQueueQuery,
  useGetMyWorklistQuery,
  useClaimQueueItemMutation,
  useStartQueueItemMutation,
  useCompleteQueueItemMutation,
  type QueueType,
  type QueuePriority,
} from "@/redux/api/laboratoryApi";

const PRIORITY_BADGES: Record<QueuePriority, { label: string; className: string }> = {
  STAT: { label: "STAT", className: "bg-red-500 hover:bg-red-600 text-white animate-pulse" },
  URGENT: { label: "URGENT", className: "bg-amber-500 hover:bg-amber-600 text-white" },
  ROUTINE: { label: "ROUTINE", className: "bg-slate-500 hover:bg-slate-600 text-white" },
};

export function LaboratoryWorklistPanel() {
  const [activeTab, setActiveTab] = useState<QueueType>("COLLECTION");

  const { data: queueItems = [], isLoading } = useGetWorkQueueQuery({
    queue_type: activeTab,
    status: "WAITING",
  });

  const { data: myWorklist = [] } = useGetMyWorklistQuery();

  const [claimQueueItem] = useClaimQueueItemMutation();
  const [startQueueItem] = useStartQueueItemMutation();
  const [completeQueueItem] = useCompleteQueueItemMutation();

  const handleClaim = async (id: string) => {
    try {
      await claimQueueItem(id).unwrap();
      toast.success("Workqueue item claimed");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to claim workqueue item");
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startQueueItem(id).unwrap();
      toast.success("Work processing started");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to start work");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeQueueItem(id).unwrap();
      toast.success("Work completed");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to complete work");
    }
  };

  return (
    <Card className="my-4 border-l-4 border-l-indigo-600">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-base font-semibold">Laboratory Worklist & Queue Workbench</CardTitle>
        </div>

        {myWorklist.length > 0 && (
          <Badge className="bg-indigo-600 text-white">
            {myWorklist.length} My Active Tasks
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as QueueType)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-5 w-full text-xs">
            <TabsTrigger value="COLLECTION">Collection</TabsTrigger>
            <TabsTrigger value="RECEPTION">Reception</TabsTrigger>
            <TabsTrigger value="PROCESSING">Processing</TabsTrigger>
            <TabsTrigger value="RESULT_ENTRY">Result Entry</TabsTrigger>
            <TabsTrigger value="VERIFICATION">Verification</TabsTrigger>
          </TabsList>

          <div className="pt-3">
            {isLoading ? (
              <div className="text-xs text-muted-foreground py-2">Loading worklist queue...</div>
            ) : queueItems.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center border rounded-md bg-muted/20">
                No items waiting in {activeTab} queue.
              </div>
            ) : (
              <div className="space-y-2">
                {queueItems.map((item) => {
                  const pBadge = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.ROUTINE;
                  const ageMins = Math.round(
                    (new Date().getTime() - new Date(item.entered_at).getTime()) / 60000
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-3 border rounded-md bg-card flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                          <Badge className={pBadge.className}>{pBadge.label}</Badge>
                          <span>{item.order?.title || "Lab Order"}</span>
                          {item.order?.patient && (
                            <span className="text-muted-foreground font-normal">
                              Patient: {item.order.patient.full_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Waiting {ageMins}m
                          </span>
                          {item.specimen && (
                            <span>Sample: {item.specimen.specimen_type} ({item.specimen.collection_status})</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === "WAITING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleClaim(item.id)}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Claim Task
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs>

        {/* My Active Tasks Section */}
        {myWorklist.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <h4 className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Flame className="h-4 w-4" /> My Active Worklist Tasks ({myWorklist.length})
            </h4>

            <div className="space-y-2">
              {myWorklist.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 border rounded bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Badge variant="outline">{task.queue_type}</Badge>
                      <span>{task.order?.title}</span>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      Patient: {task.order?.patient?.full_name || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.status === "CLAIMED" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleStart(task.id)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Start Work
                      </Button>
                    )}

                    {task.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleComplete(task.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete Task
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
