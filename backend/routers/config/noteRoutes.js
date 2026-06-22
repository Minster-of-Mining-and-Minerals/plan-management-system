const express = require("express");
const router = express.Router();

const {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  logAttachmentDownload,
} = require("../../controllers/config/noteController");

const {
  validateListNotes,
  validateCreateNote,
  validateUpdateNote,
  validateNoteIdParam,
} = require("../../validators/config/noteValidator");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("NOTES", "VIEW"),
  validateListNotes,
  listNotes
);

router.get(
  "/:id",
  checkPermission("NOTES", "VIEW"),
  validateNoteIdParam,
  getNoteById
);

router.post(
  "/",
  checkPermission("NOTES", "CREATE"),
  validateCreateNote,
  createNote
);

router.put(
  "/:id",
  checkPermission("NOTES", "UPDATE"),
  validateNoteIdParam,
  validateUpdateNote,
  updateNote
);

router.delete(
  "/:id",
  checkPermission("NOTES", "DELETE"),
  validateNoteIdParam,
  deleteNote
);

router.post(
  "/:id/attachments/:attachmentId/download-log",
  checkPermission("NOTES", "VIEW"),
  validateNoteIdParam,
  logAttachmentDownload
);

module.exports = router;
