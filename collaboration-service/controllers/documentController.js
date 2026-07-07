const documentService = require("../services/documentService");

async function listDocuments(req, res) {
  try {
    const { ownerApp, ownerType, ownerId } = req.query;
    const documents = await documentService.listDocuments({
      ownerApp,
      ownerType,
      ownerId,
      userId: req.user.user_id,
      accessToken: req.accessToken,
      user: req.user,
    });

    return res.json({ success: true, data: documents });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function createDocument(req, res) {
  try {
    const { title, ownerApp, ownerType, ownerId, fileType } = req.body;

    const document = await documentService.createDocument({
      title,
      ownerApp: ownerApp || "plan-management",
      ownerType: ownerType || "standalone",
      ownerId: ownerId || null,
      createdBy: req.user.user_id,
      accessToken: req.accessToken,
      uploadedFile: req.file || null,
      fileType: fileType || "docx",
      user: req.user,
    });

    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function getDocument(req, res) {
  try {
    const result = await documentService.getDocumentWithAccess(
      req.params.id,
      req.user.user_id,
      req.accessToken,
      { user: req.user }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({
      success: true,
      data: documentService.serializeDocument(result.document, result.access),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function deleteDocument(req, res) {
  try {
    const deleted = await documentService.deleteDocument(
      req.params.id,
      req.user.user_id,
      req.accessToken,
      req.user
    );
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function getEditorSession(req, res) {
  try {
    const session = await documentService.getEditorSession(
      req.params.id,
      req.user,
      req.accessToken
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: session });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function getVersionEditorSession(req, res) {
  try {
    const versionNumber = Number(req.params.versionNumber);
    const session = await documentService.getVersionEditorSession(
      req.params.id,
      versionNumber,
      req.user,
      req.accessToken
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: session });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function downloadVersionOnlyofficeFile(req, res) {
  try {
    const versionNumber = Number(req.params.versionNumber);
    const fileResult = await documentService.getDocumentFileBuffer(req.params.id, versionNumber);
    if (!fileResult) {
      return res.status(404).json({ error: 1, message: "Version not found" });
    }

    res.setHeader("Content-Type", fileResult.document.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileResult.document.file_name}"`
    );
    return res.send(fileResult.buffer);
  } catch (error) {
    return res.status(500).json({ error: 1, message: error.message });
  }
}

async function downloadDocumentFile(req, res) {
  try {
    const result = await documentService.getDocumentFileBuffer(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 1, message: "Document not found" });
    }

    res.setHeader("Content-Type", result.document.mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${result.document.file_name}"`);
    return res.send(result.buffer);
  } catch (error) {
    return res.status(500).json({ error: 1, message: error.message });
  }
}

async function downloadDocumentVersion(req, res) {
  try {
    const versionNumber = Number(req.params.versionNumber);
    const result = await documentService.getDocumentWithAccess(
      req.params.id,
      req.user.user_id,
      req.accessToken,
      { user: req.user }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const fileResult = await documentService.getDocumentFileBuffer(req.params.id, versionNumber);
    if (!fileResult) {
      return res.status(404).json({ success: false, message: "Version not found" });
    }

    const ext = result.document.file_type;
    const baseName = result.document.file_name.replace(/\.[^.]+$/, "");
    res.setHeader("Content-Type", result.document.mime_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}-v${versionNumber}.${ext}"`
    );
    return res.send(fileResult.buffer);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function listDocumentVersions(req, res) {
  try {
    const versions = await documentService.listDocumentVersions(
      req.params.id,
      req.user.user_id,
      req.accessToken,
      req.user
    );

    if (!versions) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: versions });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function getDocumentCounts(req, res) {
  try {
    const { ownerApp, ownerType, ownerIds } = req.query;
    const ids = String(ownerIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!ownerType || !ids.length) {
      return res.status(400).json({
        success: false,
        message: "ownerType and ownerIds are required",
      });
    }

    const counts = await documentService.countDocumentsByOwners({
      ownerApp: ownerApp || "plan-management",
      ownerType,
      ownerIds: ids,
      userId: req.user.user_id,
      accessToken: req.accessToken,
      user: req.user,
    });

    return res.json({ success: true, data: counts });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function restoreDocumentVersion(req, res) {
  try {
    const versionNumber = Number(req.params.versionNumber);
    const document = await documentService.restoreDocumentVersion(
      req.params.id,
      versionNumber,
      req.user.user_id,
      req.accessToken,
      req.user
    );

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: document });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function updateDocumentStatus(req, res) {
  try {
    const { status } = req.body;
    const document = await documentService.updateDocumentStatus(
      req.params.id,
      status,
      req.user.user_id,
      req.accessToken,
      req.user
    );

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: document });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function onlyofficeCallback(req, res) {
  try {
    const result = await documentService.handleOnlyofficeCallback(req.params.id, req.body);
    return res.json(result);
  } catch (error) {
    return res.json({ error: 1 });
  }
}

async function listDocumentShares(req, res) {
  try {
    const shares = await documentService.listDocumentShares(
      req.params.id,
      req.user.user_id,
      req.accessToken,
      req.user
    );

    if (!shares) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: shares });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function createDocumentShare(req, res) {
  try {
    const { principalType, principalId, role, expiresAt } = req.body;
    const share = await documentService.createDocumentShare(
      req.params.id,
      {
        principalType: principalType || "user",
        principalId,
        role: role || "viewer",
        expiresAt: expiresAt || null,
      },
      req.user.user_id,
      req.accessToken,
      req.user
    );

    if (!share) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.status(201).json({ success: true, data: share });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function revokeDocumentShare(req, res) {
  try {
    const revoked = await documentService.revokeDocumentShare(
      req.params.id,
      req.params.grantId,
      req.user.user_id,
      req.accessToken,
      req.user
    );

    if (revoked === null) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    if (!revoked) {
      return res.status(404).json({ success: false, message: "Share not found" });
    }

    return res.json({ success: true, message: "Share removed" });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

async function forwardDocument(req, res) {
  try {
    const { recipientUserId, message, grantAccess } = req.body;
    if (!recipientUserId) {
      return res.status(400).json({ success: false, message: "recipientUserId is required" });
    }

    const result = await documentService.forwardDocumentToUser(
      req.params.id,
      {
        recipientUserId,
        message: message || null,
        grantAccess: grantAccess !== false,
      },
      req.user,
      req.accessToken
    );

    if (!result) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

module.exports = {
  listDocuments,
  createDocument,
  getDocument,
  deleteDocument,
  getEditorSession,
  getVersionEditorSession,
  downloadDocumentFile,
  downloadVersionOnlyofficeFile,
  downloadDocumentVersion,
  listDocumentVersions,
  getDocumentCounts,
  restoreDocumentVersion,
  updateDocumentStatus,
  onlyofficeCallback,
  listDocumentShares,
  createDocumentShare,
  revokeDocumentShare,
  forwardDocument,
};
