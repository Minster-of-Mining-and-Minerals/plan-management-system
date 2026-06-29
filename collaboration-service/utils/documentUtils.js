const crypto = require("crypto");

function generateDocumentKey() {
  return crypto.randomBytes(16).toString("hex");
}

function inferFileType(fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["xls", "xlsx"].includes(ext)) return "xlsx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  if (ext === "pdf") return "pdf";
  return null;
}

function mimeTypeForFileType(fileType) {
  const map = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    pdf: "application/pdf",
  };
  return map[fileType] || "application/octet-stream";
}

function onlyofficeDocumentType(fileType) {
  if (fileType === "xlsx") return "cell";
  if (fileType === "pptx") return "slide";
  return "word";
}

module.exports = {
  generateDocumentKey,
  inferFileType,
  mimeTypeForFileType,
  onlyofficeDocumentType,
};
