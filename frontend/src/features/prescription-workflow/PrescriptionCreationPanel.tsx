"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { AppointmentSidePanelShell } from "@/features/medical-workflow/components/AppointmentSidePanelShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestionTextarea } from "@/components/clinical-suggestions/SuggestionTextarea";
import { SuggestionInput } from "@/components/clinical-suggestions/SuggestionInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useListPrescriptionCategoriesQuery } from "@/redux/api/prescriptionCategoryApi";
import {
  useGetPrescriptionTemplateQuery,
  useListPrescriptionTemplatesQuery,
} from "@/redux/api/prescriptionTemplateApi";
import {
  useCreatePrescriptionMutation,
  useGetSignatureCapabilitiesQuery,
  usePreviewPrescriptionMutation,
} from "@/redux/api/prescriptionApi";
import type { PrescriptionItem, PrescriptionRecord } from "@/redux/types/prescription";
import { PrescriptionDocumentViewer } from "./PrescriptionDocumentViewer";
import {
  buildPrescriptionPdfFilename,
  exportPrescriptionHtml,
} from "@/lib/downloadPrescriptionPdf";

type Props = {
  appointmentId: string;
  patientId: string;
  patientName?: string;
  onClose?: () => void;
  onSaved?: () => void;
  onLegacyConfirm?: (prescription: PrescriptionRecord) => void;
};

const emptyItem = (): PrescriptionItem => ({
  item_name: "",
  strength: "",
  route: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  quantity: "",
  notes: "",
});

export function PrescriptionCreationPanel({
  appointmentId,
  patientId,
  patientName,
  onClose,
  onSaved,
  onLegacyConfirm,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [categoryId, setCategoryId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [signatureType, setSignatureType] = useState<"template" | "user" | "none">("none");
  const [headerTitle, setHeaderTitle] = useState("Prescription");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([emptyItem()]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data: categories = [] } = useListPrescriptionCategoriesQuery({
    status: "active",
  });
  const { data: templates = [], isLoading: loadingTemplates } =
    useListPrescriptionTemplatesQuery(
      { category_id: categoryId || undefined, search: templateSearch || undefined },
      { skip: !categoryId }
    );
  const { data: templateDetail } = useGetPrescriptionTemplateQuery(templateId, {
    skip: !templateId,
  });
  const { data: signatureCaps } = useGetSignatureCapabilitiesQuery(
    { template_id: templateId || undefined },
    { skip: !templateId }
  );
  const [previewPrescription, { isLoading: previewing }] = usePreviewPrescriptionMutation();
  const [createPrescription, { isLoading: saving }] = useCreatePrescriptionMutation();

  useEffect(() => {
    if (templateDetail?.items?.length) {
      setItems(templateDetail.items.map((i) => ({ ...i })));
      setHeaderTitle(templateDetail.name);
    }
  }, [templateDetail]);

  useEffect(() => {
    if (!signatureCaps) return;
    setSignatureType(signatureCaps.default_signature_type);
  }, [signatureCaps, templateId]);

  const canUseUserSignature = Boolean(signatureCaps?.user_signature_available);
  const canUseTemplateSignature = Boolean(signatureCaps?.template_signature_available);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const runPreview = async (): Promise<string | null> => {
    try {
      const result = await previewPrescription({
        patient_id: patientId,
        appointment_id: appointmentId,
        category_id: categoryId || undefined,
        template_id: templateId || undefined,
        header_title: headerTitle,
        signature_type: signatureType,
        notes,
        items: items.filter((i) => i.item_name.trim()),
      }).unwrap();
      setPreviewHtml(result.html);
      return result.html;
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Preview failed";
      toast.error(message);
      return null;
    }
  };

  const handleSave = async () => {
    const validItems = items.filter((i) => i.item_name.trim());
    if (!validItems.length) {
      toast.error("Add at least one prescription item");
      return;
    }
    try {
      const saved = await createPrescription({
        patient_id: patientId,
        appointment_id: appointmentId,
        category_id: categoryId || undefined,
        template_id: templateId || undefined,
        header_title: headerTitle,
        signature_type: signatureType,
        notes,
        items: validItems,
      }).unwrap();
      toast.success("Prescription issued");
      onSaved?.();
      if (onLegacyConfirm) onLegacyConfirm(saved);
      onClose?.();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to save prescription";
      toast.error(message);
    }
  };

  const handlePrint = async () => {
    setExportingPdf(true);
    try {
      const html = previewHtml ?? (await runPreview());
      if (!html) return;
      await exportPrescriptionHtml(
        html,
        buildPrescriptionPdfFilename(headerTitle || "prescription")
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to export prescription PDF";
      toast.error(message);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <AppointmentSidePanelShell
      title="Issue prescription"
      subtitle={
        patientName
          ? `Configure and issue for ${patientName}`
          : "Select template, customize items, preview and save"
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={runPreview}
            disabled={previewing || saving}
          >
            {previewing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={saving || exportingPdf || previewing}
          >
            {exportingPdf ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-1.5 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Issue prescription"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setTemplateId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
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
          <div className="space-y-2">
            <Label>Report title</Label>
            <Input value={headerTitle} onChange={(e) => setHeaderTitle(e.target.value)} />
          </div>
        </div>

        {categoryId && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Search className="h-3.5 w-3.5" />
              Search template
            </Label>
            <Input
              placeholder="Search templates…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingTemplates ? "Loading…" : "Select template"}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.template_id} value={t.template_id}>
                    {t.name} ({t.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-semibold">Signature</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sig"
                checked={signatureType === "template"}
                disabled={!canUseTemplateSignature}
                onChange={() => setSignatureType("template")}
              />
              Organization signature
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sig"
                checked={signatureType === "user"}
                disabled={!canUseUserSignature}
                onChange={() => setSignatureType("user")}
              />
              Use my signature
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sig"
                checked={signatureType === "none"}
                onChange={() => setSignatureType("none")}
              />
              No signature image
            </label>
          </div>
          {!canUseTemplateSignature && templateId && templateDetail?.has_template_signature && (
            <p className="text-xs text-muted-foreground">
              Organization signature is not configured. Upload it in Branding → System Info →
              Prescription signature.
            </p>
          )}
          {!canUseUserSignature && (
            <p className="text-xs text-muted-foreground">
              Upload a signature in your profile to enable &quot;Use my signature&quot;.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Prescription items</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setItems((p) => [...p, emptyItem()])}
            >
              Add item
            </Button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-md border bg-muted/20 p-2 sm:grid-cols-2"
              >
                <Input
                  placeholder="Item name *"
                  value={item.item_name}
                  onChange={(e) => updateItem(index, "item_name", e.target.value)}
                />
                <Input
                  placeholder="Dosage"
                  value={item.dosage || ""}
                  onChange={(e) => updateItem(index, "dosage", e.target.value)}
                />
                <Input
                  placeholder="Frequency"
                  value={item.frequency || ""}
                  onChange={(e) => updateItem(index, "frequency", e.target.value)}
                />
                <Input
                  placeholder="Duration"
                  value={item.duration || ""}
                  onChange={(e) => updateItem(index, "duration", e.target.value)}
                />
                <SuggestionInput
                  className="sm:col-span-2 h-10"
                  placeholder="Instructions"
                  value={item.instructions || ""}
                  onChange={(v) => updateItem(index, "instructions", v)}
                  category="prescription"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Clinical notes</Label>
          <SuggestionTextarea
            value={notes}
            onChange={setNotes}
            category="prescription"
            className="min-h-[4rem] resize-none"
          />
        </div>

        {previewHtml && (
          <div ref={printRef}>
            <PrescriptionDocumentViewer html={previewHtml} constrainHeight={false} />
          </div>
        )}
      </div>
    </AppointmentSidePanelShell>
  );
}
