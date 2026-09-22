"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddBuilderWorkflowStepMutation } from "@/redux/api/clinicalWorkflowApi";
import { toast } from "sonner";

interface Props {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddWorkflowStepDialog({ workflowId, isOpen, onClose }: Props) {
  const [addStep, { isLoading }] = useAddBuilderWorkflowStepMutation();
  const [name, setName] = useState("");
  const [type, setType] = useState("DYNAMIC_FORM");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      await addStep({
        workflow_id: workflowId,
        step_data: { name, type },
      }).unwrap();
      toast.success("Step added successfully");
      onClose();
      setName("");
      setType("DYNAMIC_FORM");
    } catch (err) {
      toast.error("Failed to add step");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Workflow Step</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Step Name</Label>
            <Input
              id="name"
              placeholder="e.g., Doctor Assessment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Step Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DYNAMIC_FORM">Dynamic Form</SelectItem>
                <SelectItem value="CLINICAL_INTENT">Clinical Intent</SelectItem>
                <SelectItem value="DEPARTMENT_FULFILLMENT">Department Fulfillment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? "Adding..." : "Add Step"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
