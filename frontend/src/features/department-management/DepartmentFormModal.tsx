"use client";

import { useEffect, useMemo, useState } from "react";
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
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
} from "@/redux/api/departmentApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type { Department } from "@/redux/types/department";
import { cn } from "@/lib/utils";
import {
  modalOverlayClassName,
  modalPanelClassName,
} from "@/lib/modalLayout";

interface DepartmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
}

export function DepartmentFormModal({
  isOpen,
  onClose,
  department,
}: DepartmentFormModalProps) {
  const isEdit = Boolean(department?.department_id);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [deptHead, setDeptHead] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [headSearch, setHeadSearch] = useState("");

  const { data: users = [] } = useGetUsersQuery({ is_active: true });
  const [createDepartment, { isLoading: creating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: updating }] = useUpdateDepartmentMutation();

  useEffect(() => {
    if (!isOpen) return;
    setName(department?.name ?? "");
    setCode(department?.code ?? "");
    setDeptHead(department?.dept_head ?? "");
    setStatus(department?.status ?? "active");
    setHeadSearch("");
  }, [isOpen, department]);

  const filteredUsers = useMemo(() => {
    const term = headSearch.trim().toLowerCase();
    if (!term) return users.slice(0, 50);
    return users
      .filter(
        (u) =>
          u.full_name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [users, headSearch]);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      dept_head: deptHead || null,
      status,
    };

    try {
      if (isEdit && department) {
        await updateDepartment({ id: department.department_id, data: payload }).unwrap();
        toast.success("Department updated");
      } else {
        await createDepartment(payload).unwrap();
        toast.success("Department created");
      }
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to save department";
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={modalOverlayClassName}>
      <div className={cn(modalPanelClassName, "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Department" : "Create Department"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Department Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency" />
          </div>
          <div>
            <Label>Department Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ER"
            />
          </div>
          {/* <div>
            <Label>Department Head</Label>
            <Input
              value={headSearch}
              onChange={(e) => setHeadSearch(e.target.value)}
              placeholder="Search staff by name or email"
              className="mb-2"
            />
            <Select value={deptHead || "none"} onValueChange={(v) => setDeptHead(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department head" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No head assigned</SelectItem>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}
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
