export const getFileUrl = (filePath: string) => {
  // const apiBase =
  //   process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";
  const apiBase = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";

  // const serverBase = apiBase.replace(/\/api\/?$/, "");

  return `${apiBase}/${filePath.replace(/\\/g, "/")}`;
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