const express = require("express");
const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { requireFileToken } = require("../middlewares/fileAccessMiddleware");
const documentController = require("../controllers/documentController");

function createDocumentRouter({ authenticateToken }) {
  const router = express.Router();

  const uploadDir = path.join(os.tmpdir(), "collaboration-uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  router.get("/documents", authenticateToken, documentController.listDocuments);
  router.get("/documents/counts", authenticateToken, documentController.getDocumentCounts);
  router.post(
    "/documents",
    authenticateToken,
    upload.single("file"),
    documentController.createDocument
  );
  router.get("/documents/:id", authenticateToken, documentController.getDocument);
  router.delete("/documents/:id", authenticateToken, documentController.deleteDocument);
  router.get(
    "/documents/:id/editor-session",
    authenticateToken,
    documentController.getEditorSession
  );
  router.get(
    "/documents/:id/versions/:versionNumber/editor-session",
    authenticateToken,
    documentController.getVersionEditorSession
  );
  router.get(
    "/documents/:id/versions",
    authenticateToken,
    documentController.listDocumentVersions
  );
  router.get(
    "/documents/:id/versions/:versionNumber/file",
    authenticateToken,
    documentController.downloadDocumentVersion
  );
  router.get(
    "/documents/:id/versions/:versionNumber/onlyoffice-file",
    requireFileToken("version-file"),
    documentController.downloadVersionOnlyofficeFile
  );
  router.post(
    "/documents/:id/versions/:versionNumber/restore",
    authenticateToken,
    documentController.restoreDocumentVersion
  );
  router.patch("/documents/:id/status", authenticateToken, documentController.updateDocumentStatus);
  router.get("/documents/:id/shares", authenticateToken, documentController.listDocumentShares);
  router.post("/documents/:id/shares", authenticateToken, documentController.createDocumentShare);
  router.delete(
    "/documents/:id/shares/:grantId",
    authenticateToken,
    documentController.revokeDocumentShare
  );
  router.post("/documents/:id/forward", authenticateToken, documentController.forwardDocument);

  router.get(
    "/documents/:id/file",
    requireFileToken("file"),
    documentController.downloadDocumentFile
  );
  router.post(
    "/documents/:id/callback",
    requireFileToken("callback"),
    documentController.onlyofficeCallback
  );

  return router;
}

module.exports = createDocumentRouter;
