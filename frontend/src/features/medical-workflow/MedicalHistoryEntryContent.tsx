"use client";

import { FileText, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MedicalHistoryAttachmentList } from "./components/MedicalHistoryAttachmentList";
import { MedicalHistoryPrescriptionBlock } from "./components/MedicalHistoryPrescriptionBlock";
import { buildLogDisplaySections } from "./medicalHistoryDisplay";
import { collectWorkflowFileRefs } from "./workflowAttachmentUtils";
import type { MedicalHistoryLog } from "@/redux/api/medicalWorkflowApi";
import type { UserFormConfigGrouped } from "@/redux/types/formField";
const ACTION_LABELS: Record<string, string> = {
  submit: "Report saved",
  forward: "Forwarded",
  return: "Forwarded",
  prescribe: "Prescription",
  complete: "Workflow completed",
};

type Props = {
  entry: MedicalHistoryLog;
  compact?: boolean;
};

export function MedicalHistoryEntryContent({ entry, compact }: Props) {
  const formSchema = entry.formSchema as UserFormConfigGrouped | null | undefined;
  const sections = buildLogDisplaySections(formSchema, entry.form_data);
  const hasNotes = Boolean(entry.notes?.trim());
  const hasFormData = sections.some((s) => s.fields.length > 0);
  const hasFileAttachments =
    collectWorkflowFileRefs(entry.attachment_ids || [], formSchema, entry.form_data)
      .length > 0;
  const prescriptionId = (() => {
    const raw = entry.form_data?.prescription_id;
    return typeof raw === "string" && raw.length > 0 ? raw : undefined;
  })();
  const templateName =
    typeof entry.form_data?.template_name === "string"
      ? entry.form_data.template_name
      : entry.prescription?.template?.name;
  const isPrescribeAction = entry.action_type === "prescribe";

  if (
    compact &&
    !hasNotes &&
    !hasFileAttachments &&
    !hasFormData &&
    !isPrescribeAction
  ) {
    return null;
  }

  return (
    <div className="space-y-4 px-4 pb-4 pt-3 bg-white">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">
          {ACTION_LABELS[entry.action_type] || entry.action_type}
        </Badge>
        {entry.formConfig?.title && !isPrescribeAction && (
          <span className="inline-flex items-center gap-1">
            <Stethoscope className="h-3.5 w-3.5" />
            Template: {entry.formConfig.title}
          </span>
        )}
        {isPrescribeAction && templateName && (
          <span className="inline-flex items-center gap-1">
            <Stethoscope className="h-3.5 w-3.5" />
            {templateName}
          </span>
        )}
      </div>

      {hasNotes && (
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {entry.notes}
          </p>
        </div>
      )}

      {isPrescribeAction && (
        <MedicalHistoryPrescriptionBlock
          prescription={entry.prescription}
          prescriptionId={prescriptionId}
          appointmentId={entry.appointment_id}
          workflowLogId={entry.log_id}
          logCreatedAt={entry.created_at}
          headerTitle={entry.header_title}
          itemsSummary={
            typeof entry.form_data?.items_summary === "string"
              ? entry.form_data.items_summary
              : undefined
          }
        />
      )}

      {!isPrescribeAction && hasFileAttachments && (
        <MedicalHistoryAttachmentList
          attachmentIds={entry.attachment_ids || []}
          formSchema={formSchema}
          formData={entry.form_data}
        />
      )}

      {hasFormData && !isPrescribeAction ? (
        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="overflow-hidden rounded-lg border border-border bg-background shadow-sm"
            >
              <div className="border-b border-primary/10 bg-primary/5 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {section.title}
                </p>
                {section.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {section.description}
                  </p>
                )}
              </div>
              <dl className="divide-y divide-border/60">
                {section.fields.map((field) => (
                  <div
                    key={field.key}
                    className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(8rem,34%)_1fr] sm:gap-4"
                  >
                    <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">
                      {field.label}
                    </dt>
                    <dd
                      className={
                        field.multiline
                          ? "whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                          : "text-sm text-foreground"
                      }
                    >
                      {field.displayValue}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        !hasNotes &&
        !hasFileAttachments &&
        !isPrescribeAction && (
          <p className="text-sm text-muted-foreground">No form data recorded.</p>
        )
      )}
    </div>
  );
}
