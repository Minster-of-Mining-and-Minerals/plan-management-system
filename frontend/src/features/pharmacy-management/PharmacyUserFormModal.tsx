"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PharmacyUserRow } from "@/redux/types/pharmacy";
import {
  useCreatePharmacyUserMutation,
  useUpdatePharmacyUserMutation,
} from "@/redux/api/pharmacyApi";
import { cn } from "@/lib/utils";
import {
  modalOverlayClassName,
  modalPanelClassName,
} from "@/lib/modalLayout";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  pharmacyId: string;
  user?: PharmacyUserRow | null;
};

export function PharmacyUserFormModal({
  isOpen,
  onClose,
  pharmacyId,
  user,
}: Props) {
  const isEdit = Boolean(user);
  const [createUser, { isLoading: creating }] = useCreatePharmacyUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdatePharmacyUserMutation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [portalRole, setPortalRole] = useState<"admin" | "staff">("staff");

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setPhone(user.phone_number || "");
      setPassword("");
      setPortalRole(user.portal_role);
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setPortalRole("staff");
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name and email are required");
      return;
    }
    if (!portalRole) {
      toast.error("Please select a pharmacy role");
      return;
    }

    try {
      if (isEdit && user) {
        await updateUser({
          userId: user.user_id,
          body: {
            full_name: fullName.trim(),
            email: email.trim(),
            phone_number: phone.trim() || null,
            portal_role: portalRole,
          },
        }).unwrap();
        toast.success("Pharmacy user updated");
      } else {
        await createUser({
          pharmacyId,
          body: {
            full_name: fullName.trim(),
            email: email.trim(),
            phone_number: phone.trim() || undefined,
            password: password.trim() || undefined,
            portal_role: portalRole,
          },
        }).unwrap();
        toast.success("Pharmacy user created");
      }
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : isEdit
            ? "Failed to update user"
            : "Failed to create user";
      toast.error(message);
    }
  };

  if (!isOpen) return null;

  const saving = creating || updating;

  return (
    <div className={modalOverlayClassName}>
      <div className={cn(modalPanelClassName, "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit pharmacy user" : "Create pharmacy user"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Full name</Label>
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
              placeholder="email@pharmacy.com"
            />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2519..."
            />
          </div>
          {!isEdit && (
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for default (Pharmacy@123)"
              />
            </div>
          )}
          <div>
            <Label>
              Pharmacy role <span className="text-destructive">*</span>
            </Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Admin can manage all pharmacy prescriptions. Staff processes dispensing
              workflows assigned to the pharmacy.
            </p>
            <Select
              value={portalRole}
              onValueChange={(v) => setPortalRole(v as "admin" | "staff")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff — dispensing & fulfillment</SelectItem>
                <SelectItem value="admin">Admin — full pharmacy portal access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create user"}
          </Button>
        </div>
      </div>
    </div>
  );
}
