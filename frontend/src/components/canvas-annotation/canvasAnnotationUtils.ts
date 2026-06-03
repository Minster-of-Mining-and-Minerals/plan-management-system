import {
  parseCanvasFieldValue,
  type CanvasAnnotationFieldValue,
} from "./canvasAnnotationTypes";
import type { DynamicFormValues, UserFormConfigGrouped } from "@/redux/types/formField";
import { flattenFormFields } from "@/redux/types/formField";
import { getFileUrl, toStoredFilePath } from "@/utils/fileUrl";

export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

/** Remove inline base64 previews so JSON payloads stay small. */
export function stripInlineCanvasPreview(
  value: CanvasAnnotationFieldValue
): CanvasAnnotationFieldValue {
  if (value.preview_image && isDataUrl(value.preview_image)) {
    return { ...value, preview_image: null };
  }
  return value;
}

export function sanitizeCanvasFieldValue(value: unknown): unknown {
  const parsed = parseCanvasFieldValue(value);
  if (!parsed) return value;
  return stripInlineCanvasPreview(parsed);
}

export function sanitizeFormDataCanvasFields(
  values: DynamicFormValues,
  grouped?: UserFormConfigGrouped | null
): DynamicFormValues {
  if (!grouped) return values;
  const out = { ...values };
  for (const field of flattenFormFields(grouped)) {
    if (field.field_type !== "canvas_annotation") continue;
    if (!(field.field_key in out)) continue;
    out[field.field_key] = sanitizeCanvasFieldValue(out[field.field_key]);
  }
  return out;
}

export function formDataHasPendingCanvasPreviews(
  values: DynamicFormValues,
  grouped?: UserFormConfigGrouped | null
): boolean {
  if (!grouped) return false;
  for (const field of flattenFormFields(grouped)) {
    if (field.field_type !== "canvas_annotation") continue;
    const parsed = parseCanvasFieldValue(values[field.field_key]);
    if (parsed?.preview_image && isDataUrl(parsed.preview_image)) return true;
  }
  return false;
}

export function resolveCanvasPreviewSrc(
  preview: string | null | undefined
): string {
  if (!preview) return "";
  if (isDataUrl(preview) || /^https?:\/\//i.test(preview)) return preview;
  return getFileUrl(preview.replace(/^\/+/, ""));
}

export async function uploadCanvasPreviewDataUrl(
  dataUrl: string,
  fieldKey: string,
  upload: (arg: { files: File[] }) => Promise<{ attachments?: { file_path: string }[] }>
): Promise<string | null> {
  const file = dataUrlToFile(dataUrl, `${fieldKey}-canvas-preview.png`);
  const res = await upload({ files: [file] });
  const path = res.attachments?.[0]?.file_path;
  return path ? toStoredFilePath(path) : null;
}
