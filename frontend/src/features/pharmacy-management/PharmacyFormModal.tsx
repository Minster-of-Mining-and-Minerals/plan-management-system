"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import type { Pharmacy } from "@/redux/types/pharmacy";
import {
  useCreatePharmacyMutation,
  useUpdatePharmacyMutation,
} from "@/redux/api/pharmacyApi";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  pharmacy?: Pharmacy | null;
};

export function PharmacyFormModal({ isOpen, onClose, pharmacy }: Props) {
  const [createPharmacy, { isLoading: creating }] = useCreatePharmacyMutation();
  const [updatePharmacy, { isLoading: updating }] = useUpdatePharmacyMutation();
  const [form, setForm] = useState({
    pharmacy_name: "",
    pharmacy_code: "",
    license_number: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    region: "",
    country: "",
    contact_person: "",
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (pharmacy) {
      setForm({
        pharmacy_name: pharmacy.pharmacy_name,
        pharmacy_code: pharmacy.pharmacy_code,
        license_number: pharmacy.license_number || "",
        phone: pharmacy.phone || "",
        email: pharmacy.email || "",
        address: pharmacy.address || "",
        city: pharmacy.city || "",
        region: pharmacy.region || "",
        country: pharmacy.country || "",
        contact_person: pharmacy.contact_person || "",
        status: pharmacy.status,
      });
    } else {
      setForm({
        pharmacy_name: "",
        pharmacy_code: "",
        license_number: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        region: "",
        country: "",
        contact_person: "",
        status: "active",
      });
    }
  }, [pharmacy, isOpen]);

  const handleSubmit = async () => {
    try {
      if (pharmacy) {
        await updatePharmacy({ id: pharmacy.pharmacy_id, body: form }).unwrap();
        toast.success("Pharmacy updated");
      } else {
        await createPharmacy(form).unwrap();
        toast.success("Pharmacy created");
      }
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Save failed";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pharmacy ? "Edit pharmacy" : "New pharmacy"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>Pharmacy name</Label>
            <Input
              value={form.pharmacy_name}
              onChange={(e) => setForm((f) => ({ ...f, pharmacy_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input
              value={form.pharmacy_code}
              onChange={(e) =>
                setForm((f) => ({ ...f, pharmacy_code: e.target.value.toUpperCase() }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>License</Label>
            <Input
              value={form.license_number}
              onChange={(e) =>
                setForm((f) => ({ ...f, license_number: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Contact person</Label>
            <Input
              value={form.contact_person}
              onChange={(e) =>
                setForm((f) => ({ ...f, contact_person: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <Input
              placeholder="Region"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
            />
            <Input
              placeholder="Country"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as "active" | "inactive" }))
              }
            >
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating || updating}>
            {creating || updating ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
