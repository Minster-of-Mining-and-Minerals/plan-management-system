const { Document, DocumentVersion } = require("../models");
const {
  generateDocumentKey,
  inferFileType,
  mimeTypeForFileType,
} = require("../utils/documentUtils");
const storageService = require("./storageService");
const policyService = require("./policyService");
const userProfileService = require("./userProfileService");
const onlyofficeService = require("./onlyofficeService");

function serializeDocument(document, access = null) {
  return {
    document_id: document.document_id,
    title: document.title,
    file_name: document.file_name,
    file_type: document.file_type,
    mime_type: document.mime_type,
    file_size: document.file_size,
    version_number: document.version_number,
    status: document.status,
    owner_app: document.owner_app,
    owner_type: document.owner_type,
    owner_id: document.owner_id,
    created_by: document.created_by,
    updated_by: document.updated_by,
    created_at: document.created_at,
    updated_at: document.updated_at,
    ...(access ? { access } : {}),
  };
}

function serializeVersion(version, fileSize = null, savedByUser = null) {
  return {
    document_version_id: version.document_version_id,
    document_id: version.document_id,
    version_number: version.version_number,
    document_key: version.document_key,
    saved_by: version.saved_by,
    saved_by_name: savedByUser?.full_name || null,
    saved_by_email: savedByUser?.email || null,
    created_at: version.created_at,
    file_size: fileSize,
  };
}

function forbidden(message = "Access denied") {
  const error = new Error(message);
  error.status = 403;
  return error;
}

async function resolveAccessForDocument(document, userId, accessToken) {
  return policyService.resolveDocumentAccess({
    ownerType: document.owner_type,
    ownerId: document.owner_id,
    accessToken,
    documentStatus: document.status,
    createdBy: document.created_by,
    userId,
  });
}

async function listDocuments({ ownerApp, ownerType, ownerId, userId, accessToken }) {
  const where = {};
  if (ownerApp) where.owner_app = ownerApp;
  if (ownerType) where.owner_type = ownerType;
  if (ownerId) where.owner_id = ownerId;

  const documents = await Document.findAll({
    where,
    order: [["updated_at", "DESC"]],
  });

  const visible = [];
  for (const document of documents) {
    const access = await resolveAccessForDocument(document, userId, accessToken);
    if (access.canRead) {
      visible.push(serializeDocument(document, access));
    }
  }

  return visible;
}

async function getDocumentById(documentId) {
  return Document.findByPk(documentId);
}

async function getDocumentWithAccess(documentId, userId, accessToken, { requireEdit = false } = {}) {
  const document = await getDocumentById(documentId);
  if (!document) {
    return null;
  }

  const access = await resolveAccessForDocument(document, userId, accessToken);
  if (!access.canRead) {
    throw forbidden();
  }
  if (requireEdit && !access.canEdit) {
    throw forbidden("Not allowed to modify this document");
  }

  return { document, access };
}

async function createDocument({
  title,
  ownerApp = "plan-management",
  ownerType = "standalone",
  ownerId = null,
  createdBy,
  accessToken,
  uploadedFile = null,
}) {
  const createAccess = await policyService.resolveCreateAccess({
    ownerType,
    ownerId,
    accessToken,
  });

  if (!createAccess.canCreate) {
    throw forbidden("Not allowed to create documents in this context");
  }

  const fileType = uploadedFile ? inferFileType(uploadedFile.originalname) : "docx";
  if (!fileType) {
    throw new Error("Unsupported file type");
  }

  const fileName = uploadedFile?.originalname || `${title || "document"}.docx`;
  const destinationPath = storageService.buildStoragePath(fileName);

  if (uploadedFile) {
    storageService.writeUploadedFile(uploadedFile.path, destinationPath);
    storageService.removeFile(uploadedFile.path);
  } else {
    storageService.copyBlankTemplate(destinationPath);
  }

  const documentKey = generateDocumentKey();
  const document = await Document.create({
    title: title || "Untitled document",
    file_name: fileName,
    file_path: destinationPath,
    mime_type: uploadedFile?.mimetype || mimeTypeForFileType(fileType),
    file_type: fileType,
    file_size: storageService.getFileSize(destinationPath),
    document_key: documentKey,
    version_number: 1,
    status: "draft",
    owner_app: ownerApp,
    owner_type: ownerType,
    owner_id: ownerId,
    created_by: createdBy,
    updated_by: createdBy,
  });

  await DocumentVersion.create({
    document_id: document.document_id,
    version_number: 1,
    file_path: destinationPath,
    document_key: documentKey,
    saved_by: createdBy,
  });

  const access = await resolveAccessForDocument(document, createdBy, accessToken);
  return serializeDocument(document, access);
}

async function deleteDocument(documentId, userId, accessToken) {
  const result = await getDocumentWithAccess(documentId, userId, accessToken);
  if (!result) {
    return null;
  }

  const { document, access } = result;
  if (!access.canDelete) {
    throw forbidden("Not allowed to delete this document");
  }

  const versions = await DocumentVersion.findAll({ where: { document_id: documentId } });
  const paths = new Set(versions.map((version) => version.file_path));
  paths.add(document.file_path);

  for (const filePath of paths) {
    storageService.removeFile(filePath);
  }

  await document.destroy();
  return true;
}

async function getEditorSession(documentId, user, accessToken) {
  const result = await getDocumentWithAccess(documentId, user.user_id, accessToken);
  if (!result) {
    return null;
  }

  const { document, access } = result;
  const profile = await userProfileService.getUserProfile(accessToken);

  const editorUser = {
    user_id: user.user_id,
    full_name: profile.full_name,
    email: profile.email,
  };

  const config = onlyofficeService.buildEditorConfig(document, editorUser, access.mode);

  return {
    document: serializeDocument(document, access),
    documentServerUrl: onlyofficeService.getDocumentServerUrl(),
    access,
    config,
  };
}

async function getVersionEditorSession(documentId, versionNumber, user, accessToken) {
  const result = await getDocumentWithAccess(documentId, user.user_id, accessToken);
  if (!result) {
    return null;
  }

  const { document, access } = result;
  const version = await DocumentVersion.findOne({
    where: { document_id: documentId, version_number: versionNumber },
  });

  if (!version) {
    const error = new Error("Version not found");
    error.status = 404;
    throw error;
  }

  try {
    storageService.readFile(version.file_path);
  } catch {
    const error = new Error("Version file is missing");
    error.status = 404;
    throw error;
  }

  let fileSize = null;
  try {
    fileSize = storageService.getFileSize(version.file_path);
  } catch {
    fileSize = null;
  }

  const profile = await userProfileService.getUserProfile(accessToken);
  const editorUser = {
    user_id: user.user_id,
    full_name: profile.full_name,
    email: profile.email,
  };

  const displayNames = version.saved_by
    ? await userProfileService.resolveUserDisplayNames(accessToken, [version.saved_by])
    : {};
  const savedByUser = version.saved_by ? displayNames[version.saved_by] : null;

  const config = onlyofficeService.buildVersionEditorConfig(
    document,
    version,
    editorUser,
    versionNumber
  );

  return {
    document: serializeDocument(document, access),
    version_number: versionNumber,
    version: serializeVersion(version, fileSize, savedByUser),
    documentServerUrl: onlyofficeService.getDocumentServerUrl(),
    access: { ...access, mode: "view", canEdit: false },
    config,
  };
}

async function getDocumentFileBuffer(documentId, versionNumber = null) {
  const document = await getDocumentById(documentId);
  if (!document) {
    return null;
  }

  if (versionNumber === null) {
    return {
      document,
      buffer: storageService.readFile(document.file_path),
    };
  }

  const version = await DocumentVersion.findOne({
    where: { document_id: documentId, version_number: versionNumber },
  });

  if (!version) {
    return null;
  }

  return {
    document,
    version,
    buffer: storageService.readFile(version.file_path),
  };
}

async function listDocumentVersions(documentId, userId, accessToken) {
  const result = await getDocumentWithAccess(documentId, userId, accessToken);
  if (!result) {
    return null;
  }

  const versions = await DocumentVersion.findAll({
    where: { document_id: documentId },
    order: [["version_number", "DESC"]],
  });

  const savedByIds = versions.map((version) => version.saved_by).filter(Boolean);
  const displayNames = await userProfileService.resolveUserDisplayNames(accessToken, savedByIds);

  return versions.map((version) => {
    let fileSize = null;
    try {
      fileSize = storageService.getFileSize(version.file_path);
    } catch {
      fileSize = null;
    }

    const savedByUser = version.saved_by ? displayNames[version.saved_by] : null;
    return serializeVersion(version, fileSize, savedByUser);
  });
}

async function countDocumentsByOwners({
  ownerApp = "plan-management",
  ownerType,
  ownerIds = [],
  userId,
  accessToken,
}) {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  const counts = {};

  for (const ownerId of uniqueIds) {
    const documents = await listDocuments({
      ownerApp,
      ownerType,
      ownerId,
      userId,
      accessToken,
    });
    counts[ownerId] = documents.length;
  }

  return counts;
}

async function restoreDocumentVersion(documentId, versionNumber, userId, accessToken) {
  const result = await getDocumentWithAccess(documentId, userId, accessToken, { requireEdit: true });
  if (!result) {
    return null;
  }

  const { document } = result;
  const version = await DocumentVersion.findOne({
    where: { document_id: documentId, version_number: versionNumber },
  });

  if (!version) {
    const error = new Error("Version not found");
    error.status = 404;
    throw error;
  }

  const buffer = storageService.readFile(version.file_path);
  const nextVersion = document.version_number + 1;
  const nextKey = generateDocumentKey();
  const nextPath = storageService.buildStoragePath(document.file_name);

  storageService.writeFile(nextPath, buffer);

  await DocumentVersion.create({
    document_id: document.document_id,
    version_number: nextVersion,
    file_path: nextPath,
    document_key: nextKey,
    saved_by: userId,
  });

  await document.update({
    file_path: nextPath,
    file_size: buffer.length,
    version_number: nextVersion,
    document_key: nextKey,
    updated_by: userId,
  });

  const access = await resolveAccessForDocument(document, userId, accessToken);
  return serializeDocument(document, access);
}

async function updateDocumentStatus(documentId, status, userId, accessToken) {
  const result = await getDocumentWithAccess(documentId, userId, accessToken);
  if (!result) {
    return null;
  }

  const { document, access } = result;

  if (status === "finalized") {
    if (!access.canFinalize) {
      throw forbidden("Not allowed to finalize this document");
    }
  } else if (status === "draft") {
    if (!access.canUnfinalize) {
      throw forbidden("Not allowed to reopen this document");
    }
  } else {
    const error = new Error("Invalid document status");
    error.status = 400;
    throw error;
  }

  await document.update({
    status,
    updated_by: userId,
  });

  const nextAccess = await resolveAccessForDocument(document, userId, accessToken);
  return serializeDocument(document, nextAccess);
}

async function handleOnlyofficeCallback(documentId, body) {
  const document = await getDocumentById(documentId);
  if (!document) {
    return { error: 1 };
  }

  if (document.status === "finalized") {
    return { error: 0 };
  }

  const status = Number(body?.status);
  // 1 = editing, 2 = must save, 3 = save error, 4 = closed no changes, 6 = forcesave, 7 = forcesave error
  if (![2, 6].includes(status) || !body?.url) {
    return { error: 0 };
  }

  const response = await fetch(body.url);
  if (!response.ok) {
    return { error: 1 };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const nextVersion = document.version_number + 1;
  const nextKey = generateDocumentKey();
  const nextPath = storageService.buildStoragePath(document.file_name);

  storageService.writeFile(nextPath, buffer);

  await DocumentVersion.create({
    document_id: document.document_id,
    version_number: nextVersion,
    file_path: nextPath,
    document_key: document.document_key,
    saved_by: Array.isArray(body.users) ? body.users[0] : null,
  });

  await document.update({
    file_path: nextPath,
    file_size: buffer.length,
    version_number: nextVersion,
    document_key: nextKey,
    updated_by: Array.isArray(body.users) ? body.users[0] : document.updated_by,
  });

  return { error: 0 };
}

module.exports = {
  listDocuments,
  getDocumentById,
  getDocumentWithAccess,
  createDocument,
  deleteDocument,
  getEditorSession,
  getVersionEditorSession,
  getDocumentFileBuffer,
  listDocumentVersions,
  countDocumentsByOwners,
  restoreDocumentVersion,
  updateDocumentStatus,
  handleOnlyofficeCallback,
  serializeDocument,
};
