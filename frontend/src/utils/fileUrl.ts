export const getFileUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const apiBase = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";

  return `${apiBase}/${normalized.replace(/^\//, "")}`;
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