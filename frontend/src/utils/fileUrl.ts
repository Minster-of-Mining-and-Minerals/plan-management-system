import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import { getAuthToken } from "@/lib/authToken";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractAttachmentId(pathOrId: string): string | null {
  const normalized = pathOrId.replace(/\\/g, "/").replace(/^\//, "").trim();
  if (!normalized) return null;
  if (UUID_RE.test(normalized)) return normalized;

  const attachmentMatch = normalized.match(
    /(?:^|\/)(?:uploads\/)?attachments\/([0-9a-f-]{36})(?:\/|$|\.)/i
  );
  if (attachmentMatch?.[1] && UUID_RE.test(attachmentMatch[1])) {
    return attachmentMatch[1];
  }

  const basename = normalized.split("/").pop()?.split("?")[0] || "";
  if (UUID_RE.test(basename)) return basename;
  return null;
}

/**
 * Authenticated attachment download URL (Bearer via ?token= for img/href).
 * Prefer this over raw /uploads/attachments paths.
 */
export const getAttachmentFileUrl = (attachmentId: string) => {
  const apiBase =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000/api";
  const base = `${apiBase.replace(/\/$/, "")}/attachments/${attachmentId}/file`;
  const token = typeof window !== "undefined" ? getAuthToken() : null;
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
};

/**
 * Resolve a stored file path or attachment id to a browser-usable URL.
 * Attachment UUIDs / uploads/attachments/* go through the authenticated API.
 */
export const getFileUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const attachmentId = extractAttachmentId(normalized);
  if (attachmentId) return getAttachmentFileUrl(attachmentId);

  const apiBase = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";
  return `${apiBase}/${normalized.replace(/^\//, "")}`;
};

/** Resolve preview URL from upload API payload or stored ref. */
export const getAttachmentPreviewUrl = (attachment: {
  attachment_id?: string;
  download_url?: string;
  file_path?: string;
}) => {
  if (attachment.attachment_id) {
    return getAttachmentFileUrl(attachment.attachment_id);
  }
  if (attachment.download_url) {
    const apiHost = (
      process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000"
    ).replace(/\/$/, "");
    const path = attachment.download_url.startsWith("http")
      ? attachment.download_url
      : `${apiHost}${attachment.download_url}`;
    const asAttachment = extractAttachmentId(path);
    if (asAttachment) return getAttachmentFileUrl(asAttachment);
    const token = typeof window !== "undefined" ? getAuthToken() : null;
    if (!token) return path;
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}token=${encodeURIComponent(token)}`;
  }
  if (attachment.file_path) return getFileUrl(attachment.file_path);
  return null;
};

/** URL for branding logos (default public path vs uploaded attachment). */
export const getBrandingAssetUrl = (filePath: string) => {
  const trimmed = filePath?.trim() || PLATFORM_LOGO_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("uploads/") || trimmed.includes("/uploads/")) {
    return getFileUrl(trimmed);
  }
  const attachmentId = extractAttachmentId(trimmed);
  if (attachmentId) return getAttachmentFileUrl(attachmentId);
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
};

/** Store attachment paths relative to the API host (not full URLs). */
export const toStoredFilePath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\\/g, "/");
  try {
    const u = new URL(trimmed);
    return u.pathname.replace(/^\//, "");
  } catch {
    return trimmed;
  }
};

export const getFileType = (fileName: string): string => {
  const extension = fileName.toLowerCase().split(".").pop();
  if (
    ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(
      extension || ""
    )
  ) {
    return "image";
  } else if (extension === "pdf") {
    return "pdf";
  } else if (["doc", "docx", "txt", "rtf"].includes(extension || "")) {
    return "document";
  } else {
    return "other";
  }
};
