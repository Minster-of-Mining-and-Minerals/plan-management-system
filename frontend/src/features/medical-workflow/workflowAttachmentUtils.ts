import { flattenFormFields } from "@/redux/types/formField";
import type { UserFormConfigGrouped } from "@/redux/types/formField";
import type { Attachment } from "@/redux/api/attachementApi";
import { getFileUrl } from "@/utils/fileUrl";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAttachmentUuid(value: string) {
  return UUID_RE.test(value.trim());
}

export function isStoredFileRef(value: string) {
  const v = value.trim();
  if (!v) return false;
  if (isAttachmentUuid(v)) return true;
  if (/^https?:\/\//i.test(v)) return true;
  return v.includes("uploads/") || v.includes("attachments/");
}

export function fileNameFromRef(ref: string) {
  const raw = ref.trim();
  const segment = raw.split(/[/\\]/).pop() || raw;
  try {
    return decodeURIComponent(segment.split("?")[0] || "Attachment");
  } catch {
    return segment.split("?")[0] || "Attachment";
  }
}

export function previewUrlFromRef(ref: string) {
  const v = ref.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (v.includes("uploads/") || v.startsWith("uploads")) {
    return getFileUrl(v.replace(/^\/+/, ""));
  }
  return null;
}

export function collectWorkflowFileRefs(
  attachmentIds: string[],
  formSchema?: UserFormConfigGrouped | null,
  formData?: Record<string, unknown>
): string[] {
  const refs = new Set<string>();

  for (const id of attachmentIds) {
    if (id?.trim() && isStoredFileRef(id)) refs.add(id.trim());
  }

  if (formSchema && formData) {
    const fileFields = flattenFormFields(formSchema).filter(
      (f) => f.field_type === "file"
    );
    for (const field of fileFields) {
      const v = formData[field.field_key];
      if (typeof v === "string" && isStoredFileRef(v)) refs.add(v.trim());
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string" && isStoredFileRef(item)) refs.add(item.trim());
        }
      }
    }
  }

  return [...refs];
}

export type ResolvedWorkflowFile = {
  key: string;
  file_name: string;
  previewUrl: string | null;
};

export function resolveWorkflowFiles(
  refs: string[],
  attachments: Attachment[] = []
): ResolvedWorkflowFile[] {
  const byId = new Map(attachments.map((a) => [a.attachment_id, a]));
  const resolved: ResolvedWorkflowFile[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    const key = ref.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (isAttachmentUuid(key)) {
      const record = byId.get(key);
      if (record) {
        resolved.push({
          key,
          file_name: record.file_name,
          previewUrl: getFileUrl(record.file_path),
        });
      }
      continue;
    }

    resolved.push({
      key,
      file_name: fileNameFromRef(key),
      previewUrl: previewUrlFromRef(key),
    });
  }

  return resolved;
}
