"use client";

import React, { useState } from "react";
import {
  Settings,
  Plus,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useGetLicenseTypesQuery,
  useCreateLicenseTypeMutation,
  useUpdateLicenseTypeMutation,
} from "@/redux/api/licenseApi";
import type { LicenseType } from "@/redux/types/license";
import { toast } from "sonner";

interface LicenseTypeManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LicenseTypeManagementModal({
  open,
  onOpenChange,
}: LicenseTypeManagementModalProps) {
  const { data: licenseTypes = [], isLoading, refetch } = useGetLicenseTypesQuery();
  const [createType, { isLoading: isCreating }] = useCreateLicenseTypeMutation();
  const [updateType, { isLoading: isUpdating }] = useUpdateLicenseTypeMutation();

  const [editingType, setEditingType] = useState<LicenseType | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const resetForm = () => {
    setEditingType(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
  };

  const handleStartEdit = (type: LicenseType) => {
    setEditingType(type);
    setFormName(type.name);
    setFormCode(type.code);
    setFormDescription(type.description || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Name and Code are required.");
      return;
    }

    try {
      if (editingType) {
        await updateType({
          id: editingType.license_type_id,
          data: {
            name: formName.trim(),
            code: formCode.trim().toUpperCase(),
            description: formDescription.trim() || undefined,
          },
        }).unwrap();
        toast.success("License type updated successfully!");
      } else {
        await createType({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          description: formDescription.trim() || undefined,
          is_active: true,
        }).unwrap();
        toast.success("License type created successfully!");
      }
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to save license type");
    }
  };

  const handleToggleStatus = async (type: LicenseType) => {
    try {
      await updateType({
        id: type.license_type_id,
        data: { is_active: !type.is_active },
      }).unwrap();
      toast.success(
        `License type ${!type.is_active ? "activated" : "deactivated"} successfully!`
      );
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to toggle status");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-600" />
            Configurable License Types Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Table of Types */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-slate-500 border-b">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {licenseTypes.map((t) => (
                  <tr key={t.license_type_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {t.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {t.code}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate">
                      {t.description || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={t.is_active ? "default" : "secondary"}
                        className={
                          t.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleStartEdit(t)}
                        >
                          <Edit className="h-3 w-3 text-slate-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 px-2 text-xs ${
                            t.is_active ? "text-amber-600" : "text-emerald-600"
                          }`}
                          onClick={() => handleToggleStatus(t)}
                        >
                          {t.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Form to Add / Edit */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border space-y-3"
          >
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-emerald-600" />
              {editingType ? `Edit License Type: ${editingType.name}` : "Create New License Type"}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="typeName" className="text-xs font-semibold">
                  Type Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="typeName"
                  placeholder="e.g. Small-Scale Mining"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="typeCode" className="text-xs font-semibold">
                  Unique Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="typeCode"
                  placeholder="e.g. SSML"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                  className="mt-1 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="typeDesc" className="text-xs">
                Description
              </Label>
              <Textarea
                id="typeDesc"
                placeholder="Scope, legal requirements or guidelines for this license category..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingType && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="text-xs"
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {editingType ? "Update Type" : "Add License Type"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
