"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User as UserIcon, RotateCcw, UserPlus, Info } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { useGetRegionalStructuresQuery } from "@/redux/api/regionApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import { useAssignRegionalPlanNodeMutation } from "@/redux/api/regionalPlanApi";
import type { RegionalPlanNode } from "@/redux/types/regionalPlan";

interface AssignRegionalPlanNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: RegionalPlanNode;
  regionId: string;
}

interface AssignRegionalPlanNodeFormProps {
  node: RegionalPlanNode;
  regionId: string;
  onClose: () => void;
}

function AssignRegionalPlanNodeForm({
  node,
  regionId,
  onClose,
}: AssignRegionalPlanNodeFormProps) {
  const isExclusive = node.assignment_sharing_mode !== "shared";
  const activeAssignments = (node.internalAssignments || []).filter(
    (a) => a.is_active !== false
  );
  const currentAssignment = activeAssignments[0];
  const isReassign = isExclusive && activeAssignments.length > 0;

  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    currentAssignment?.regional_structure_id || ""
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentAssignment?.assigned_user_id || currentAssignment?.assignedUser?.user_id || ""
  );

  const { data: structures = [], isLoading: isLoadingStructures } =
    useGetRegionalStructuresQuery({ region_id: regionId }, { skip: !regionId });

  const { data: users = [], isLoading: isLoadingUsers } = useGetUsersQuery(
    { region_id: regionId, regional_structure_id: selectedStructureId || undefined },
    { skip: !regionId }
  );

  const [assignNode, { isLoading: isAssigning }] = useAssignRegionalPlanNodeMutation();

  // Alphabetically sorted structures
  const sortedStructures = useMemo(() => {
    return [...structures].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [structures]);

  // Alphabetically sorted users
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" })
    );
  }, [users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructureId && !selectedUserId) {
      actionFeedback.error("Please select a regional department or designated officer.");
      return;
    }

    const foundUser = selectedUserId
      ? users.find((u) => u.user_id === selectedUserId)
      : null;
    const effectiveStructureId = selectedStructureId || foundUser?.regional_structure_id || "";

    try {
      await assignNode({
        nodeId: node.regional_plan_node_id,
        region_id: regionId,
        regional_structure_id: effectiveStructureId,
        assigned_user_id: selectedUserId || null,
      }).unwrap();

      actionFeedback.success(
        isReassign
          ? "Milestone responsibility reassigned successfully."
          : "Milestone responsibility assigned successfully."
      );
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      actionFeedback.error(apiErr?.data?.message || "Failed to update milestone assignment.");
    }
  };

  return (
    <DialogContent className="max-w-md">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReassign ? (
              <>
                <RotateCcw className="h-5 w-5 text-primary" />
                <span>Reassign Milestone Directorate</span>
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 text-primary" />
                <span>Assign Milestone Directorate</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Assign organizational responsibility for &ldquo;{node.title}&rdquo; (Level {node.level}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm">
          {isReassign && currentAssignment?.department && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div className="text-xs leading-relaxed">
                Currently assigned to <strong>{currentAssignment.department.name}</strong>
                {currentAssignment.assignedUser ? ` (${currentAssignment.assignedUser.full_name})` : ""}.
                Selecting a different directorate will reassign this milestone.
              </div>
            </div>
          )}

          {/* Department Selection */}
          <div className="space-y-1.5">
            <Label className="text-foreground font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Responsible Directorate / Department *</span>
            </Label>
            <Select
              value={selectedStructureId}
              onValueChange={(val) => {
                setSelectedStructureId(val);
                setSelectedUserId(""); // reset user on department change
              }}
              disabled={isLoadingStructures}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select regional department..." />
              </SelectTrigger>
              <SelectContent>
                {sortedStructures.map((s) => (
                  <SelectItem key={s.regional_structure_id} value={s.regional_structure_id}>
                    {s.name} {s.level ? `(Level ${s.level})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Staff / Lead Selection */}
          <div className="space-y-1.5">
            <Label className="text-foreground font-semibold flex items-center gap-1.5">
              <UserIcon className="h-3.5 w-3.5 text-primary" />
              <span>Assigned Staff / Lead (Optional)</span>
            </Label>
            <Select
              value={selectedUserId || "__none__"}
              onValueChange={(val) => setSelectedUserId(val === "__none__" ? "" : val)}
              disabled={!selectedStructureId || isLoadingUsers}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All staff in department (unassigned lead)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  All staff in department (No specific lead)
                </SelectItem>
                {sortedUsers.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Leave unassigned to make the entire directorate accountable.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button type="submit" disabled={isAssigning || !selectedStructureId}>
            {isAssigning
              ? "Saving..."
              : isReassign
              ? "Reassign Responsibility"
              : "Assign Responsibility"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function AssignRegionalPlanNodeModal({
  isOpen,
  onClose,
  node,
  regionId,
}: AssignRegionalPlanNodeModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AssignRegionalPlanNodeForm
        node={node}
        regionId={regionId}
        onClose={onClose}
      />
    </Dialog>
  );
}
