const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const STORAGE_ROOT = path.resolve(
  process.env.DOCUMENT_STORAGE_PATH || path.join(__dirname, "../storage/documents")
);
const BLANK_TEMPLATES = {
  docx: path.join(__dirname, "../templates/blank.docx"),
  xlsx: path.join(__dirname, "../templates/blank.xlsx"),
};

function ensureStorageRoot() {
  if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  }
}

function buildStoragePath(fileName) {
  ensureStorageRoot();
  const safeName = fileName.replace(/[^\w.\-]/g, "_");
  return path.join(STORAGE_ROOT, `${uuidv4()}_${safeName}`);
}

function copyBlankTemplate(destinationPath, fileType = "docx") {
  const templatePath = BLANK_TEMPLATES[fileType];
  if (!templatePath || !fs.existsSync(templatePath)) {
    throw new Error(`Blank ${fileType} template is missing`);
  }
  fs.copyFileSync(templatePath, destinationPath);
}

function writeUploadedFile(sourcePath, destinationPath) {
  ensureStorageRoot();
  fs.copyFileSync(sourcePath, destinationPath);
}

function readFile(filePath) {
  return fs.readFileSync(filePath);
}

function writeFile(filePath, buffer) {
  ensureStorageRoot();
  fs.writeFileSync(filePath, buffer);
}

function removeFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

module.exports = {
  STORAGE_ROOT,
  buildStoragePath,
  copyBlankTemplate,
  writeUploadedFile,
  readFile,
  writeFile,
  removeFile,
  getFileSize,
  ensureStorageRoot,
};
