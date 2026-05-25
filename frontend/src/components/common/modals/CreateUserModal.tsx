"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import { useCreateUserMutation } from "@/redux/api/userApi";
import { ChevronDown, XIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: rolesResponse } = useGetRolesQuery();
  const roles = rolesResponse || [];
  const [createUser, { isLoading }] = useCreateUserMutation();

  useEffect(() => {
    if (!isOpen) return;
    setFullName("");
    setEmail("");
    setPhone("");
    setSelectedRoles([]);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and email are required");
      return;
    }

    try {
      await createUser({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phone.trim() || undefined,
        role_ids: selectedRoles.length ? selectedRoles : undefined,
      }).unwrap();
      toast.success("Staff user created");
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Failed to create user";
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card w-full max-w-lg rounded-lg border p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create Staff User</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2519..."
            />
          </div>

          <div>
            <Label>Roles</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedRoles.length
                    ? `${selectedRoles.length} selected`
                    : "Select roles"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-2">
                {roles.map((role: { role_id: string; name: string }) => (
                  <label
                    key={role.role_id}
                    className="flex items-center gap-2 p-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.role_id)}
                      onChange={(e) => {
                        setSelectedRoles((prev) =>
                          e.target.checked
                            ? [...prev, role.role_id]
                            : prev.filter((id) => id !== role.role_id)
                        );
                      }}
                    />
                    {role.name}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating…" : "Create User"}
          </Button>
        </div>
      </div>
    </div>
  );
};
