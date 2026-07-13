"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import DetailHeader from "@/components/common/DetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useCreateReceiptTemplateMutation,
  useGetReceiptTemplatePlaceholdersQuery,
  useGetReceiptTemplateQuery,
  useUpdateReceiptTemplateMutation,
} from "@/redux/api/receiptTemplateApi";
import { CASHIER_PERMISSIONS } from "@/features/cashier/cashierUtils";
import { DEFAULT_RECEIPT_TEMPLATE_HTML } from "./receiptTemplateUtils";

type Props = {
  templateId?: string;
};

export function ReceiptTemplateEditor({ templateId }: Props) {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const isEditMode = Boolean(templateId);

  const { can } = usePermissions();
  const canSave = isEditMode
    ? can(CASHIER_PERMISSIONS.RECEIPT_TEMPLATE_UPDATE)
    : can(CASHIER_PERMISSIONS.RECEIPT_TEMPLATE_CREATE);

  const { data: placeholders = [] } = useGetReceiptTemplatePlaceholdersQuery();
  const { data: template, isLoading } = useGetReceiptTemplateQuery(templateId!, {
    skip: !isEditMode,
  });

  const [createTemplate, { isLoading: creating }] =
    useCreateReceiptTemplateMutation();
  const [updateTemplate, { isLoading: updating }] =
    useUpdateReceiptTemplateMutation();

  const [form, setForm] = useState({
    name: "",
    code: "",
    html_content: DEFAULT_RECEIPT_TEMPLATE_HTML,
    is_default: false,
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        code: template.code,
        html_content: template.html_content || DEFAULT_RECEIPT_TEMPLATE_HTML,
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

  const handleSave = async () => {
    if (!canSave) {
      toast.error("You do not have permission to save receipt templates");
      return;
    }

    const payload = {
      name: form.name,
      code: form.code,
      html_content: form.html_content,
      is_default: form.is_default,
      status: form.status,
    };

    try {
      if (isEditMode && templateId) {
        await updateTemplate({ templateId, body: payload }).unwrap();
        toast.success("Receipt template updated");
      } else {
        const created = await createTemplate(payload).unwrap();
        toast.success("Receipt template created");
        router.push(`/finance/receipt-templates/${created.template_id}`);
        return;
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Save failed";
      toast.error(message);
    }
  };

  if (isEditMode && isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { title: "Receipt templates", link: "/finance/receipt-templates" },
          { title: isEditMode ? "Edit template" : "New template" },
        ]}
      />
      <h1 className="text-xl font-semibold text-primary">
        {isEditMode ? "Edit receipt template" : "New receipt template"}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg border bg-white p-6 shadow">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_default}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_default: checked }))
                }
              />
              <Label>Default receipt template</Label>
            </div>
            <Badge variant={form.status === "active" ? "default" : "secondary"}>
              {form.status}
            </Badge>
          </div>

          <div className="space-y-1">
            <Label>HTML template</Label>
            <textarea
              ref={htmlRef}
              className="min-h-[420px] w-full rounded-md border bg-muted/20 p-3 font-mono text-xs"
              value={form.html_content}
              onChange={(e) =>
                setForm((f) => ({ ...f, html_content: e.target.value }))
              }
            />
          </div>

          <Button onClick={handleSave} disabled={!canSave || creating || updating}>
            {isEditMode ? "Save changes" : "Create template"}
          </Button>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow">
          <p className="mb-3 text-sm font-semibold">Placeholders</p>
          <ul className="max-h-[520px] space-y-2 overflow-y-auto text-sm">
            {placeholders.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  className="w-full rounded border px-2 py-1.5 text-left hover:bg-muted/50"
                  onClick={() => insertPlaceholder(p.key)}
                >
                  <code className="text-xs">{`{{${p.key}}}`}</code>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
