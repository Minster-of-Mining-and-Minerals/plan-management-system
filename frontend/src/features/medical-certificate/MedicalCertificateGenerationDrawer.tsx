"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import {
  useIssueMedicalCertificateMutation,
  useListScheduleMedicalCertificatesQuery,
  usePreviewMedicalCertificateMutation,
} from "@/redux/api/medicalCertificateApi";
import { useListMedicalCertificateTemplatesQuery } from "@/redux/api/medicalCertificateTemplateApi";
import {
  DEFAULT_CERTIFICATE_INCLUDE_OPTIONS,
  type MedicalCertificateIncludeOptions,
} from "@/redux/types/medicalCertificate";
import {
  MEDICAL_CERTIFICATE_PRINT_CSS,
  MEDICAL_CERTIFICATE_VIEWPORT_CSS,
} from "./certificatePrintStyles";
import {
  buildMedicalCertificatePdfFilename,
  exportMedicalCertificateHtml,
} from "@/lib/downloadMedicalCertificatePdf";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  scheduleId: string;
  appointmentId?: string | null;
  disabled?: boolean;
};

const INCLUDE_LABELS: Record<keyof MedicalCertificateIncludeOptions, string> = {
  diagnosis: "Diagnosis summary",
  treatment: "Treatment summary",
  prescription_reference: "Prescription reference",
  lab_results: "Lab / investigation results",
  procedure_notes: "Procedure / clinical notes",
  referral: "Referral / routing",
};

export function MedicalCertificateGenerationDrawer({
  open,
  onOpenChange,
  patientId,
  scheduleId,
  appointmentId,
  disabled,
}: Props) {
  const { data: templates = [] } = useListMedicalCertificateTemplatesQuery(
    { status: "active" },
    { skip: !open }
  );
  const { data: issued = [], refetch: refetchIssued } =
    useListScheduleMedicalCertificatesQuery(scheduleId, { skip: !open });

  const [preview, { isLoading: previewing }] = usePreviewMedicalCertificateMutation();
  const [issue, { isLoading: issuing }] = useIssueMedicalCertificateMutation();

  const defaultTemplateId = useMemo(
    () =>
      templates.find((t) => t.is_default)?.template_id ||
      templates[0]?.template_id ||
      "",
    [templates]
  );

  const [templateId, setTemplateId] = useState("");
  const [signatureType, setSignatureType] = useState<"template" | "user" | "none">(
    "template"
  );
  const [doctorNotes, setDoctorNotes] = useState("");
  const [includeOptions, setIncludeOptions] =
    useState<MedicalCertificateIncludeOptions>(DEFAULT_CERTIFICATE_INCLUDE_OPTIONS);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{
    certificate_number: string;
  } | null>(null);

  useEffect(() => {
    if (defaultTemplateId && !templateId) {
      setTemplateId(defaultTemplateId);
    }
  }, [defaultTemplateId, templateId]);

  useEffect(() => {
    if (!open) {
      setPreviewHtml(null);
      setPreviewMeta(null);
    }
  }, [open]);

  const buildPayload = () => ({
    patient_id: patientId,
    schedule_id: scheduleId,
    appointment_id: appointmentId || undefined,
    template_id: templateId || undefined,
    include_options: includeOptions,
    signature_type: signatureType,
    doctor_notes: doctorNotes.trim() || undefined,
  });

  const handlePreview = async () => {
    try {
      const data = await preview(buildPayload()).unwrap();
      setPreviewHtml(data.rendered_html);
      setPreviewMeta({ certificate_number: data.certificate_number });
      toast.success("Preview updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
  };

  const handleIssue = async () => {
    try {
      const data = await issue(buildPayload()).unwrap();
      setPreviewHtml(data.rendered_html);
      setPreviewMeta({ certificate_number: data.certificate_number });
      await refetchIssued();
      toast.success("Medical certificate issued");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue certificate");
    }
  };

  const handleDownload = async (html: string, number: string) => {
    try {
      await exportMedicalCertificateHtml(
        html,
        buildMedicalCertificatePdfFilename(number)
      );
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed");
    }
  };

  const busy = previewing || issuing;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle>Medical certificate</SheetTitle>
          <SheetDescription>
            Generate a printable certificate from this visit workflow. PDF is
            exported on your device (same approach as prescriptions).
          </SheetDescription>
        </SheetHeader>

        <PermissionGuard
          requireAny={["MEDICAL_CERTIFICATE:CREATE"]}
          fallback={
            <p className="p-6 text-sm text-muted-foreground">
              You do not have permission to issue medical certificates.
            </p>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Document template</Label>
                <Select
                  value={templateId}
                  onValueChange={setTemplateId}
                  disabled={disabled || !templates.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.template_id} value={t.template_id}>
                        {t.name}
                        {t.is_default ? " (default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Signature</Label>
                <Select
                  value={signatureType}
                  onValueChange={(v) =>
                    setSignatureType(v as "template" | "user" | "none")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Organization signature</SelectItem>
                    <SelectItem value="user">My signature</SelectItem>
                    <SelectItem value="none">No signature image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Doctor remarks (optional)</Label>
                <Textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes for the certificate…"
                />
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Include workflow sections</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    Object.keys(INCLUDE_LABELS) as (keyof MedicalCertificateIncludeOptions)[]
                  ).map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{INCLUDE_LABELS[key]}</span>
                      <Switch
                        checked={Boolean(includeOptions[key])}
                        onCheckedChange={(checked) =>
                          setIncludeOptions((o) => ({ ...o, [key]: checked }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || busy || !templateId}
                onClick={handlePreview}
              >
                {previewing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-1.5 h-4 w-4" />
                )}
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={disabled || busy || !templateId}
                onClick={handleIssue}
              >
                {issuing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Issue certificate
              </Button>
              {previewHtml && previewMeta && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    handleDownload(previewHtml, previewMeta.certificate_number)
                  }
                >
                  <FileDown className="mr-1.5 h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>

            {previewHtml && (
              <div
                data-certificate-viewport
                className="overflow-auto rounded-md border bg-muted/30 p-3"
              >
                <style>{MEDICAL_CERTIFICATE_PRINT_CSS}</style>
                <style>{MEDICAL_CERTIFICATE_VIEWPORT_CSS}</style>
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            )}

            {issued.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Issued for this visit</p>
                <ul className="space-y-2">
                  {issued.map((cert) => (
                    <li
                      key={cert.certificate_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        {cert.certificate_number}
                        <span className="ml-2 text-muted-foreground">
                          {cert.created_at
                            ? new Date(cert.created_at).toLocaleString()
                            : ""}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDownload(
                            cert.rendered_html,
                            cert.certificate_number
                          )
                        }
                      >
                        <FileDown className="mr-1 h-4 w-4" />
                        PDF
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PermissionGuard>
      </SheetContent>
    </Sheet>
  );
}
