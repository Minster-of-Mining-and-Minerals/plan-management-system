"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDelegateRegionalAssignmentMutation } from "@/redux/api/nationalReportingApi";
import { useGetRegionalStructuresQuery } from "@/redux/api/regionApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import { Building2, UserCheck, Users, Share2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment;
  regionId: string;
}

export function RegionalDelegateNationalKpiModal({
  isOpen,
  onClose,
  assignment,
  regionId,
}: Props) {
  const [delegateAssignment, { isLoading: isDelegating }] = useDelegateRegionalAssignmentMutation();

  const { data: structures = [] } = useGetRegionalStructuresQuery(
    { region_id: regionId, is_active: true },
    { skip: !isOpen || !regionId }
  );

  const { data: users = [] } = useGetUsersQuery(
    { region_id: regionId, is_active: true, limit: 200 },
    { skip: !isOpen || !regionId }
  );

  const [selectedStructureId, setSelectedStructureId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("none");
  const [delegationNotes, setDelegationNotes] = useState<string>("");

  useEffect(() => {
    if (isOpen && assignment) {
      setSelectedStructureId(assignment.regional_structure_id || "all");
      setSelectedUserId(assignment.delegated_user_id || "none");
      setDelegationNotes(assignment.delegation_notes || "");
    }
  }, [isOpen, assignment]);

  // Filter users by selected structure if specific structure is selected
  const filteredUsers = React.useMemo(() => {
    if (!users || users.length === 0) return [];
    if (selectedStructureId === "all") return users;
    return users.filter((u: any) => u.regional_structure_id === selectedStructureId);
  }, [users, selectedStructureId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await delegateAssignment({
        regionId,
        assignmentId: assignment.assignment_id,
        data: {
          regional_structure_id: selectedStructureId !== "all" ? selectedStructureId : null,
          delegated_user_id: selectedUserId !== "none" ? selectedUserId : null,
          delegation_notes: delegationNotes.trim() || null,
        },
      }).unwrap();

      toast.success("National indicator successfully assigned/delegated internally.");
      onClose();
    } catch (err: any) {
      console.error("Delegation error:", err);
      toast.error(err?.data?.message || "Failed to delegate indicator.");
    }
  };

  const req = assignment.requirement;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {assignment.delegated_user_id || assignment.regional_structure_id
                  ? "Reassign / Delegate National Indicator"
                  : "Assign National Indicator to Department / User"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Delegate reporting responsibility for this national indicator within the regional bureau
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Target KPI Header */}
          <div className="bg-slate-50 border rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {req?.code || "REQ"}
              </Badge>
              <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                {req?.title}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-4">
              <span>Unit: {req?.expected_unit}</span>
              <span>Frequency: {assignment.frequency_override || req?.frequency}</span>
            </div>
          </div>

          {/* Department Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              Regional Department / Directorate (Optional)
            </Label>
            <Select
              value={selectedStructureId}
              onValueChange={(val) => {
                setSelectedStructureId(val);
                // Reset user if current user is not in this department
                if (val !== "all") {
                  const match = users.find(
                    (u: any) => u.user_id === selectedUserId && u.regional_structure_id === val
                  );
                  if (!match) setSelectedUserId("none");
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Department..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire Regional Bureau (All Departments)</SelectItem>
                {structures.map((s: any) => (
                  <SelectItem key={s.regional_structure_id} value={s.regional_structure_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400">
              Restrict delegation to a specific regional directorate or leave open to the entire bureau.
            </p>
          </div>

          {/* User Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              Designated Officer / Reporting Person (Optional)
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select User..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Specific User (Open to Department Officers)</SelectItem>
                {filteredUsers.map((u: any) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400">
              Select an individual user responsible for collecting and submitting evidence/actuals.
            </p>
          </div>

          {/* Delegation Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Internal Delegation Notes / Guidelines
            </Label>
            <Textarea
              rows={3}
              value={delegationNotes}
              onChange={(e) => setDelegationNotes(e.target.value)}
              placeholder="Instructions, methodology guidelines, or operational notes for the assigned officer..."
              className="text-xs min-h-[70px] resize-y"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isDelegating}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isDelegating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isDelegating ? "Saving..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
