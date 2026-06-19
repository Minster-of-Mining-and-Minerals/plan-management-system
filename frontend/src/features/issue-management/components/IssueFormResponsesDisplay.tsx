"use client";

import type { IssueAttachmentRef, IssueFormResponseRef } from "@/redux/types/issue";
import { IssueAttachmentCards } from "./IssueAttachmentCards";

interface IssueFormResponsesDisplayProps {
  responses: IssueFormResponseRef[];
  attachments?: IssueAttachmentRef[];
}

function optionLabel(
  options: { label: string; value: string }[] | undefined,
  value: string
) {
  return options?.find((o) => o.value === value)?.label ?? value;
}

function formatResponseValue(response: IssueFormResponseRef): string {
  const fieldType = String(response.field?.field_type || "TEXT").toUpperCase();
  const json = response.value_json;

  if (fieldType === "BOOLEAN") {
    const boolVal =
      typeof json?.boolean === "boolean"
        ? json.boolean
        : response.value_text === "true";
    return boolVal ? "Yes" : "No";
  }

  if (fieldType === "NUMBER" && json?.number !== undefined) {
    return String(json.number);
  }

  if (fieldType === "MULTI_SELECT" || fieldType === "CHECKBOX") {
    const values = Array.isArray(json?.values) ? json.values.map(String) : [];
    if (!values.length) return response.value_text || "—";
    return values
      .map((v) => optionLabel(response.field?.options, v))
      .join(", ");
  }

  if (fieldType === "SELECT" || fieldType === "RADIO") {
    const value = json?.value ?? response.value_text;
    if (value == null || value === "") return "—";
    return optionLabel(response.field?.options, String(value));
  }

  return response.value_text || "—";
}

function getAttachmentIds(response: IssueFormResponseRef): string[] {
  const json = response.value_json;
  if (Array.isArray(json?.attachment_ids)) {
    return json.attachment_ids.map(String);
  }
  if (Array.isArray(json?.files)) {
    return json.files
      .map((f) => (f as { attachment_id?: string }).attachment_id)
      .filter(Boolean)
      .map(String);
  }
  return [];
}

export function IssueFormResponsesDisplay({
  responses,
  attachments = [],
}: IssueFormResponsesDisplayProps) {
  const sorted = [...responses].sort(
    (a, b) => (a.field?.display_order ?? 0) - (b.field?.display_order ?? 0)
  );

  if (!sorted.length) return null;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="font-medium">Category Details</p>
      {sorted.map((response) => {
        const fieldType = String(response.field?.field_type || "TEXT").toUpperCase();
        const isAttachment =
          fieldType === "ATTACHMENT" || fieldType === "FILE" || fieldType === "IMAGE";
        const attachmentIds = isAttachment ? getAttachmentIds(response) : [];
        const matchedAttachments = attachmentIds
          .map((id) => attachments.find((a) => a.attachment_id === id))
          .filter(Boolean) as IssueAttachmentRef[];

        return (
          <div key={response.issue_form_response_id}>
            <p className="text-muted-foreground">{response.field?.label || "Field"}</p>
            {isAttachment ? (
              <IssueAttachmentCards attachments={matchedAttachments} />
            ) : (
              <p className="mt-1 whitespace-pre-wrap">{formatResponseValue(response)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
