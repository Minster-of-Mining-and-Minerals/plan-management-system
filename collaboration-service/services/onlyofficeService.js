const jwt = require("jsonwebtoken");
const { onlyofficeDocumentType } = require("../utils/documentUtils");
const {
  createDocumentFileToken,
  createDocumentCallbackToken,
  createDocumentVersionFileToken,
} = require("../utils/fileTokenUtils");

function getPublicBaseUrl() {
  return (
    process.env.COLLABORATION_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  ).replace(/\/$/, "");
}

function buildEditorConfig(document, user, mode) {
  const publicBaseUrl = getPublicBaseUrl();
  const fileToken = createDocumentFileToken(document.document_id);
  const callbackToken = createDocumentCallbackToken(document.document_id);

  const canEdit = mode === "edit" && document.status !== "finalized" && document.file_type !== "pdf";
  const fileName =
    document.file_name ||
    (document.title?.endsWith(`.${document.file_type}`)
      ? document.title
      : `${document.title || "document"}.${document.file_type}`);

  const config = {
    width: "100%",
    height: "100%",
    document: {
      fileType: document.file_type,
      key: document.document_key,
      title: fileName,
      url: `${publicBaseUrl}/api/v1/documents/${document.document_id}/file?token=${fileToken}`,
      permissions: {
        edit: canEdit,
        download: true,
        print: true,
        review: canEdit,
        comment: true,
        copy: true,
        modifyFilter: canEdit,
        modifyContentControl: canEdit,
        fillForms: canEdit,
      },
    },
    documentType: onlyofficeDocumentType(document.file_type),
    editorConfig: {
      mode: canEdit ? "edit" : "view",
      callbackUrl: `${publicBaseUrl}/api/v1/documents/${document.document_id}/callback?token=${callbackToken}`,
      user: {
        id: String(user.user_id),
        name: user.full_name || user.email || "User",
      },
      coEditing: {
        mode: "fast",
        change: true,
      },
      customization: {
        forcesave: true,
        autosave: true,
        chat: true,
        comments: true,
        submitForm: true,
      },
    },
  };

  const secret =
    process.env.ONLYOFFICE_JWT_ENABLED === "true"
      ? process.env.ONLYOFFICE_JWT_SECRET
      : null;
  if (secret) {
    config.token = jwt.sign(config, secret);
  }

  return config;
}

function buildVersionEditorConfig(document, version, user, versionNumber) {
  const publicBaseUrl = getPublicBaseUrl();
  const fileToken = createDocumentVersionFileToken(document.document_id, versionNumber);

  const versionFileName = `${document.title || "document"}_v${versionNumber}.${document.file_type}`;

  const config = {
    width: "100%",
    height: "100%",
    document: {
      fileType: document.file_type,
      key: `${version.document_key}_v${versionNumber}`,
      title: versionFileName,
      url: `${publicBaseUrl}/api/v1/documents/${document.document_id}/versions/${versionNumber}/onlyoffice-file?token=${fileToken}`,
      permissions: {
        edit: false,
        download: true,
        print: true,
        review: false,
        comment: false,
        copy: true,
        modifyFilter: false,
        modifyContentControl: false,
        fillForms: false,
      },
    },
    documentType: onlyofficeDocumentType(document.file_type),
    editorConfig: {
      mode: "view",
      user: {
        id: String(user.user_id),
        name: user.full_name || user.email || "User",
      },
      customization: {
        forcesave: false,
        chat: false,
        comments: false,
      },
    },
  };

  const secret =
    process.env.ONLYOFFICE_JWT_ENABLED === "true"
      ? process.env.ONLYOFFICE_JWT_SECRET
      : null;
  if (secret) {
    config.token = jwt.sign(config, secret);
  }

  return config;
}

function getDocumentServerUrl() {
  const raw = (
    process.env.ONLYOFFICE_URL ||
    process.env.NEXT_PUBLIC_ONLYOFFICE_URL ||
    "http://localhost:8080"
  ).trim();

  const normalized = raw.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    console.warn(
      `[onlyoffice] ONLYOFFICE_URL must be an absolute URL. Got "${raw}". Falling back to http://localhost:8080`
    );
    return "http://localhost:8080";
  }

  return normalized;
}

module.exports = {
  buildEditorConfig,
  buildVersionEditorConfig,
  getDocumentServerUrl,
  getPublicBaseUrl,
};
