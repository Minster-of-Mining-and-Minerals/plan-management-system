"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateUserTitleMutation,
  useUpdateUserTitleMutation,
} from "@/redux/api/userTitleApi";
import type { UserTitle } from "@/redux/types/userTitle";
import { cn } from "@/lib/utils";
import {
  modalOverlayClassName,
  modalPanelClassName,
} from "@/lib/modalLayout";

interface UserTitleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTitle?: UserTitle | null;
}

export function UserTitleFormModal({
  isOpen,
  onClose,
  userTitle,
}: UserTitleFormModalProps) {
  const isEdit = Boolean(userTitle?.title_id);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [createUserTitle, { isLoading: creating }] = useCreateUserTitleMutation();
  const [updateUserTitle, { isLoading: updating }] = useUpdateUserTitleMutation();

  useEffect(() => {
    if (!isOpen) return;
    setName(userTitle?.name ?? "");
    setCode(userTitle?.code ?? "");
    setStatus(userTitle?.status ?? "active");
  }, [isOpen, userTitle]);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      status,
    };

    try {
      if (isEdit && userTitle) {
        await updateUserTitle({ id: userTitle.title_id, data: payload }).unwrap();
        toast.success("Title updated");
      } else {
        await createUserTitle(payload).unwrap();
        toast.success("Title created");
      }
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to save title";
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={modalOverlayClassName}>
      <div className={cn(modalPanelClassName, "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit User Title" : "Create User Title"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Title Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr."
            />
          </div>
          <div>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DR"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating || updating}>
            {creating || updating ? "Saving…" : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
