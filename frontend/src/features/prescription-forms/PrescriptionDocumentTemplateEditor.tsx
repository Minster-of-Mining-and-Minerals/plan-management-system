"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import DetailHeader from "@/components/common/DetailHeader";
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
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useListPrescriptionCategoriesQuery } from "@/redux/api/prescriptionCategoryApi";
import {
  useCreatePrescriptionDocumentTemplateMutation,
  useGetPrescriptionDocumentPlaceholdersQuery,
  useGetPrescriptionDocumentTemplateQuery,
  useUpdatePrescriptionDocumentTemplateMutation,
} from "@/redux/api/prescriptionDocumentTemplateApi";
import {
  DEFAULT_DOCUMENT_TEMPLATE_HTML,
  GLASSES_PRESCRIPTION_DOCUMENT_HTML,
  buildDocumentPreviewMarkup,
} from "./prescriptionDocumentUtils";

type Props = {
  documentTemplateId?: string;
};

export function PrescriptionDocumentTemplateEditor({ documentTemplateId }: Props) {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const isEditMode = Boolean(documentTemplateId);

  const { data: categories = [] } = useListPrescriptionCategoriesQuery({
    status: "active",
  });
  const { data: placeholders = [] } = useGetPrescriptionDocumentPlaceholdersQuery();
  const { data: template, isLoading } = useGetPrescriptionDocumentTemplateQuery(
    documentTemplateId!,
    { skip: !isEditMode }
  );

  const [createTemplate, { isLoading: creating }] =
    useCreatePrescriptionDocumentTemplateMutation();
  const [updateTemplate, { isLoading: updating }] =
    useUpdatePrescriptionDocumentTemplateMutation();

  const [form, setForm] = useState({
    name: "",
    code: "",
    category_id: "",
    html_content: DEFAULT_DOCUMENT_TEMPLATE_HTML,
    is_default: false,
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        code: template.code,
        category_id: template.category_id || "",
        html_content: template.html_content || DEFAULT_DOCUMENT_TEMPLATE_HTML,
        is_default: template.is_default,
        status: template.status,
      });
    }
  }, [template]);

  const insertPlaceholder = (key: string) => {
    const token = `{{${key}}}`;
    const el = htmlRef.current;
    if (!el) {
      setForm((f) => ({ ...f, html_content: `${f.html_content}${token}` }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    setForm((f) => ({ ...f, html_content: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const copyPlaceholder = async (key: string) => {
    const token = `{{${key}}}`;
    try {
      await navigator.clipboard.writeText(token);
      toast.success(`Copied ${token}`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      code: form.code,
      category_id: form.category_id || null,
      html_content: form.html_content,
      is_default: form.is_default,
      status: form.status,
    };
    try {
      if (isEditMode && documentTemplateId) {
        await updateTemplate({
          documentTemplateId,
          body: payload,
        }).unwrap();
        toast.success("Document template updated");
      } else {
        await createTemplate(payload).unwrap();
        toast.success("Document template created");
      }
      router.push("/prescriptions?tab=documents");
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Save failed";
      toast.error(message);
    }
  };

  if (isEditMode && isLoading) {
    return <Loading01 />;
  }

  const previewHtml = buildDocumentPreviewMarkup(form.html_content);
  const saving = creating || updating;

  return (
    <div className="-m-6 flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="border-b bg-background px-6 py-4">
        <DetailHeader
          breadcrumbs={[
            { title: "Prescriptions", link: "/prescriptions?tab=documents" },
            {
              title: isEditMode ? form.name || "Edit layout" : "New document layout",
              link: "",
            },
          ]}
        />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {isEditMode ? "Edit document layout" : "New document layout"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              HTML template for printable prescriptions. Branding placeholders are
              filled from system configuration at print time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/prescriptions?tab=documents")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save layout"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <div className="space-y-4 overflow-y-auto border-r p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={form.code}
                disabled={isEditMode}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Category scope (optional)</Label>
              <Select
                value={form.category_id || "__all__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category_id: v === "__all__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.category_id} value={c.category_id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_default}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
            />
            <Label>Default for scope</Label>
          </div>

          <div className="space-y-2">
            <Label>Placeholders</Label>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border bg-muted/30 p-2">
              {placeholders.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted"
                  onClick={() => insertPlaceholder(p.key)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    copyPlaceholder(p.key);
                  }}
                  title={`${p.description} — right-click to copy`}
                >
                  {`{{${p.key}}}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to insert at cursor. Use classes like{" "}
              <code className="text-xs">rx-document</code>,{" "}
              <code className="text-xs">rx-header</code>,{" "}
              <code className="text-xs">rx-body</code>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  html_content: DEFAULT_DOCUMENT_TEMPLATE_HTML,
                  code: f.code || "standard_rx",
                }))
              }
            >
              Load standard template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  html_content: GLASSES_PRESCRIPTION_DOCUMENT_HTML,
                  code: f.code || "glasses_rx",
                  name: f.name || "Glasses / Ophthalmic Prescription",
                }))
              }
            >
              Load glasses template
            </Button>
          </div>

          <div className="space-y-1">
            <Label>HTML content</Label>
            <textarea
              ref={htmlRef}
              className="min-h-[calc(100dvh-28rem)] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed lg:min-h-[480px]"
              value={form.html_content}
              onChange={(e) =>
                setForm((f) => ({ ...f, html_content: e.target.value }))
              }
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-muted/20">
          <div className="sticky top-0 z-10 border-b bg-muted/20 px-4 py-3 backdrop-blur-sm">
            <Badge variant="outline">Live preview (sample data)</Badge>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className="mx-auto max-w-[210mm] bg-white shadow-md"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
