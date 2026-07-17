import { PLATFORM_LOGO_URL } from "@/config/platformBranding";
import { getAuthToken } from "@/lib/authToken";

export const getFileUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const apiBase = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";

  return `${apiBase}/${normalized.replace(/^\//, "")}`;
};

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
