"use strict";

const noteService = require("../../services/noteService");
const {
  AUDIT_MODULES,
  getClientIp,
  recordSystemAuditLog,
} = require("../../services/auditLogService");
const { assertNotePermission } = require("../../utils/notePermissionUtils");

function handleError(res, error) {
  const status = error.status || 500;
  return res.status(status).json({ success: false, message: error.message });
}

const listNotes = async (req, res) => {
  try {
    assertNotePermission(req.user?.permissions || [], "view");
    const query = req.validatedQuery ?? req.query;
    const result = await noteService.listNotes(req.user.user_id, query);
    return res.json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getNoteById = async (req, res) => {
  try {
    assertNotePermission(req.user?.permissions || [], "view");
    const note = await noteService.getNoteById(req.params.id, req.user.user_id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    await recordSystemAuditLog({
      module: AUDIT_MODULES.NOTES,
      action: "view",
      entityId: note.note_id,
      entityLabel: note.title,
      summary: `Viewed note: ${note.title}`,
      changedBy: req.user.user_id,
      ipAddress: getClientIp(req),
    });

    return res.json({ success: true, data: note });
  } catch (error) {
    return handleError(res, error);
  }
};

const createNote = async (req, res) => {
  try {
    const note = await noteService.createNote(
      req.body,
      req.user.user_id,
      req.user?.permissions || []
    );

    await recordSystemAuditLog({
      module: AUDIT_MODULES.NOTES,
      action: "create",
      entityId: note.note_id,
      entityLabel: note.title,
      newValues: note,
      changedBy: req.user.user_id,
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: note,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateNote = async (req, res) => {
  try {
    const previous = await noteService.getNoteById(req.params.id, req.user.user_id);
    if (!previous) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    const note = await noteService.updateNote(
      req.params.id,
      req.body,
      req.user.user_id,
      req.user?.permissions || []
    );

    await recordSystemAuditLog({
      module: AUDIT_MODULES.NOTES,
      action: "update",
      entityId: note.note_id,
      entityLabel: note.title,
      previousValues: previous,
      newValues: note,
      changedBy: req.user.user_id,
      ipAddress: getClientIp(req),
    });

    return res.json({
      success: true,
      message: "Note updated successfully",
      data: note,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteNote = async (req, res) => {
  try {
    const previous = await noteService.getNoteById(req.params.id, req.user.user_id);
    if (!previous) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    await noteService.deleteNote(
      req.params.id,
      req.user.user_id,
      req.user?.permissions || []
    );

    await recordSystemAuditLog({
      module: AUDIT_MODULES.NOTES,
      action: "delete",
      entityId: previous.note_id,
      entityLabel: previous.title,
      previousValues: previous,
      changedBy: req.user.user_id,
      ipAddress: getClientIp(req),
    });

    return res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const logAttachmentDownload = async (req, res) => {
  try {
    assertNotePermission(req.user?.permissions || [], "view");
    const note = await noteService.getNoteById(req.params.id, req.user.user_id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    await recordSystemAuditLog({
      module: AUDIT_MODULES.NOTES,
      action: "download_attachment",
      entityId: note.note_id,
      entityLabel: note.title,
      summary: `Downloaded attachment for note: ${note.title}`,
      newValues: { attachment_id: req.params.attachmentId },
      changedBy: req.user.user_id,
      ipAddress: getClientIp(req),
    });

    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  logAttachmentDownload,
};
