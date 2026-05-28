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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListPrescriptionCategoriesQuery } from "@/redux/api/prescriptionCategoryApi";
import {
  useCreatePrescriptionTemplateMutation,
  useGetPrescriptionTemplateQuery,
  useUpdatePrescriptionTemplateMutation,
} from "@/redux/api/prescriptionTemplateApi";
import type { PrescriptionTemplate, PrescriptionTemplateItem } from "@/redux/types/prescription";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PrescriptionTemplate | null;
  onSaved: () => void;
};

const emptyItem = (): PrescriptionTemplateItem => ({
  item_name: "",
  strength: "",
  route: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  quantity: "",
});

export function PrescriptionTemplateModal({
  open,
  onOpenChange,
  editing,
  onSaved,
}: Props) {
  const { data: categories = [] } = useListPrescriptionCategoriesQuery({
    status: "active",
  });
  const { data: fullTemplate } = useGetPrescriptionTemplateQuery(
    editing?.template_id || "",
    { skip: !editing?.template_id || !open }
  );
  const [createTemplate] = useCreatePrescriptionTemplateMutation();
  const [updateTemplate] = useUpdatePrescriptionTemplateMutation();

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    code: "",
    description: "",
    has_template_signature: false,
    allow_user_signature_override: true,
  });
  const [items, setItems] = useState<PrescriptionTemplateItem[]>([emptyItem()]);

  useEffect(() => {
    const source = fullTemplate || editing;
    if (source && open && editing) {
      setForm({
        category_id: source.category_id,
        name: source.name,
        code: source.code,
        description: source.description || "",
        has_template_signature: source.has_template_signature,
        allow_user_signature_override: source.allow_user_signature_override,
      });
      setItems(
        source.items?.length ? source.items.map((i) => ({ ...i })) : [emptyItem()]
      );
    } else if (open && !editing) {
      setForm({
        category_id: "",
        name: "",
        code: "",
        description: "",
        has_template_signature: false,
        allow_user_signature_override: true,
      });
      setItems([emptyItem()]);
    }
  }, [editing, fullTemplate, open]);

  const handleSave = async () => {
    const payload = {
      ...form,
      template_signature_file: null,
      items: items.filter((i) => i.item_name.trim()),
    };
    try {
      if (editing) {
        await updateTemplate({ templateId: editing.template_id, body: payload }).unwrap();
        toast.success("Template updated");
      } else {
        await createTemplate(payload).unwrap();
        toast.success("Template created");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Save failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit template" : "New prescription template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.has_template_signature}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, has_template_signature: v }))
                  }
                />
                <Label>Use organization signature on print</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.allow_user_signature_override}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, allow_user_signature_override: v }))
                  }
                />
                <Label>Allow prescriber signature override</Label>
              </div>
            </div>

            {form.has_template_signature && (
              <p className="text-xs text-muted-foreground">
                Uses the prescription signature uploaded in System Branding settings.
                Configure it under Branding → Organization / hospital location.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Template items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setItems((p) => [...p, emptyItem()])}
              >
                Add item
              </Button>
            </div>
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded border p-2 sm:grid-cols-2">
                <Input
                  placeholder="Item name"
                  value={item.item_name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, item_name: e.target.value } : row
                      )
                    )
                  }
                />
                <Input
                  placeholder="Strength"
                  value={item.strength || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, strength: e.target.value } : row
                      )
                    )
                  }
                />
                <Input
                  placeholder="Dosage"
                  value={item.dosage || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, dosage: e.target.value } : row
                      )
                    )
                  }
                />
                <Input
                  placeholder="Frequency"
                  value={item.frequency || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, frequency: e.target.value } : row
                      )
                    )
                  }
                />
                <Input
                  placeholder="Route"
                  value={item.route || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, route: e.target.value } : row
                      )
                    )
                  }
                />
                <Input
                  placeholder="Duration"
                  value={item.duration || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, duration: e.target.value } : row
                      )
                    )
                  }
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="Instructions"
                  value={item.instructions || ""}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, instructions: e.target.value } : row
                      )
                    )
                  }
                />
              </div>
            ))}
          </div>

          <Button onClick={handleSave}>Save template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
