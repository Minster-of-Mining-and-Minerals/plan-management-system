"use client";

import { useState } from "react";
import { Cpu, Plus, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAllocateResourceMutation } from "@/redux/api/capacityApi";

export function ResourceAllocationBoard() {
  const [allocateResource, { isLoading }] = useAllocateResourceMutation();
  const [message, setMessage] = useState<string | null>(null);

  const handleAllocate = async (isEmergency = false) => {
    try {
      await allocateResource({
        resource_type: "ROOM",
        resource_id: "room-101",
        assigned_to_type: "DEPARTMENT",
        assigned_to_id: "CONSULTATION",
        priority: isEmergency ? "STAT" : "ROUTINE",
        is_emergency: isEmergency,
      }).unwrap();
      setMessage(isEmergency ? "Emergency override allocated successfully!" : "Resource allocated successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(`Allocation error: ${err?.data?.message || err?.message || "Failed"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-semibold">Clinical Resource Allocation Engine</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px]">Staff / Room / Equipment</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-3">
        <div className="text-[11px] text-muted-foreground">
          Allocate clinical staff, consultation rooms, and radiology/lab equipment with automatic conflict detection.
        </div>

        {message && <div className="p-2 border rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">{message}</div>}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={isLoading} onClick={() => handleAllocate(false)}>
            <Plus className="h-3 w-3 mr-1" /> Quick Room Allocate
          </Button>
          <Button size="sm" variant="destructive" className="h-7 text-[10px]" disabled={isLoading} onClick={() => handleAllocate(true)}>
            <Zap className="h-3 w-3 mr-1" /> Emergency Override
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
