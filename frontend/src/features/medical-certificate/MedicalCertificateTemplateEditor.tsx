"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import DetailHeader from "@/components/common/DetailHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useCreateMedicalCertificateTemplateMutation,
  useGetMedicalCertificatePlaceholdersQuery,
  useGetMedicalCertificateTemplateQuery,
  useUpdateMedicalCertificateTemplateMutation,
} from "@/redux/api/medicalCertificateTemplateApi";
import {
  DEFAULT_CERTIFICATE_BODY_HTML,
  DEFAULT_CERTIFICATE_FOOTER_HTML,
  DEFAULT_CERTIFICATE_HEADER_HTML,
  buildCertificatePreviewMarkup,
} from "./certificateDocumentUtils";
import { MEDICAL_CERTIFICATE_VIEWPORT_CSS } from "./certificatePrintStyles";

type Props = {
  templateId?: string;
};

export function MedicalCertificateTemplateEditor({ templateId }: Props) {
  const router = useRouter();
  const isEditMode = Boolean(templateId);

  const { data: placeholders = [] } = useGetMedicalCertificatePlaceholdersQuery();
  const { data: template, isLoading } = useGetMedicalCertificateTemplateQuery(
    templateId!,
    { skip: !isEditMode }
  );

  const [createTemplate, { isLoading: creating }] =
    useCreateMedicalCertificateTemplateMutation();
  const [updateTemplate, { isLoading: updating }] =
    useUpdateMedicalCertificateTemplateMutation();

  const [form, setForm] = useState({
    name: "",
    code: "",
    header_html: DEFAULT_CERTIFICATE_HEADER_HTML,
    footer_html: DEFAULT_CERTIFICATE_FOOTER_HTML,
    html_content: DEFAULT_CERTIFICATE_BODY_HTML,
    is_default: false,
    has_template_stamp: false,
    status: "active",
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        code: template.code,
        header_html: template.header_html,
        footer_html: template.footer_html,
        html_content: template.html_content,
        is_default: template.is_default,
        has_template_stamp: template.has_template_stamp,
        status: template.status,
      });
    }
  }, [template]);

  const previewMarkup = buildCertificatePreviewMarkup(
    form.header_html,
    form.footer_html,
    form.html_content
  );

  const handleSave = async () => {
    try {
      if (isEditMode && templateId) {
        await updateTemplate({ templateId, body: form }).unwrap();
        toast.success("Template updated");
      } else {
        await createTemplate(form).unwrap();
        toast.success("Template created");
        router.push("/prescriptions?tab=certificates");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (isLoading && isEditMode) return <Loading01 />;

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { title: "Prescriptions", link: "/prescriptions?tab=certificates" },
          { title: isEditMode ? "Edit certificate template" : "New certificate template" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                disabled={isEditMode}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_default}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
            />
            <Label>Default template</Label>
          </div>

          <div className="space-y-2">
            <Label>Header HTML (reusable)</Label>
            <Textarea
              value={form.header_html}
              onChange={(e) => setForm((f) => ({ ...f, header_html: e.target.value }))}
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Body HTML</Label>
            <Textarea
              value={form.html_content}
              onChange={(e) => setForm((f) => ({ ...f, html_content: e.target.value }))}
              rows={14}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Footer HTML (reusable)</Label>
            <Textarea
              value={form.footer_html}
              onChange={(e) => setForm((f) => ({ ...f, footer_html: e.target.value }))}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={creating || updating}>
              Save template
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/prescriptions?tab=certificates")}
            >
              Cancel
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Placeholders</p>
            <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
              {placeholders.map((p) => (
                <Badge
                  key={p.key}
                  variant="outline"
                  className="cursor-default font-mono text-xs"
                  title={p.description}
                >
                  {`{{${p.key}}}`}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Sample preview</p>
            <style>{MEDICAL_CERTIFICATE_VIEWPORT_CSS}</style>
            <div
              className="overflow-auto rounded-md border bg-white p-2"
              dangerouslySetInnerHTML={{ __html: previewMarkup }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
