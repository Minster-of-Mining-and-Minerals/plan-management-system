"use client";

import { FileText, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MedicalHistoryAttachmentList } from "./components/MedicalHistoryAttachmentList";
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

  if (compact && !hasNotes && !hasFileAttachments && !hasFormData) {
    return null;
  }

  return (
    <div className="space-y-4 px-4 pb-4 pt-3 bg-white">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">
          {ACTION_LABELS[entry.action_type] || entry.action_type}
        </Badge>
        {entry.formConfig?.title && (
          <span className="inline-flex items-center gap-1">
            <Stethoscope className="h-3.5 w-3.5" />
            Template: {entry.formConfig.title}
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

      {hasFileAttachments && (
        <MedicalHistoryAttachmentList
          attachmentIds={entry.attachment_ids || []}
          formSchema={formSchema}
          formData={entry.form_data}
        />
      )}

      {hasFormData ? (
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
        !hasFileAttachments && (
          <p className="text-sm text-muted-foreground">No form data recorded.</p>
        )
      )}
    </div>
  );
}
