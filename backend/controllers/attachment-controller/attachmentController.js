"use strict";

const { Attachment } = require("../../models");
const path = require("path");
const fs = require("fs");
const { logAudit, auditContextFromReq } = require("../../services/auditService");
const { sendError } = require("../../utils/httpError");
const attachmentAccess = require("../../services/attachmentAccessService");

function attachmentDownloadPath(attachmentId) {
  return `/api/attachments/${attachmentId}/file`;
}

function toClientAttachment(record) {
  return {
    attachment_id: record.attachment_id,
    file_name: record.file_name,
    uploaded_by: record.uploaded_by,
    created_at: record.created_at,
    resource_type: record.resource_type || null,
    resource_id: record.resource_id || null,
    patient_id: record.patient_id || null,
    download_url: attachmentDownloadPath(record.attachment_id),
  };
}

function resolveStoredPath(filePath) {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(process.cwd(), filePath);
}

const uploadFiles = async (req, res) => {
  try {
    if (!(await attachmentAccess.canUpload(req.user))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to upload attachments",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const ctxFields = attachmentAccess.parseUploadContext(req.body || {});
    // Patients may only attach to themselves
    if (req.user?.account_type === "PATIENT") {
      ctxFields.patient_id = req.user.user_id;
      if (!ctxFields.resource_type || ctxFields.resource_type === "generic") {
        ctxFields.resource_type = attachmentAccess.RESOURCE_TYPES.PATIENT;
        ctxFields.resource_id = req.user.user_id;
      }
    }

    const uploadDir = path.join("uploads", "attachments");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const newPath = path.join(uploadDir, file.filename);
      fs.copyFileSync(file.path, newPath);
      fs.unlinkSync(file.path);

      const recordData = {
        file_name: file.filename,
        file_path: newPath,
        created_at: new Date(),
        uploaded_by: req.user?.user_id || null,
        resource_type: ctxFields.resource_type,
        resource_id: ctxFields.resource_id,
        patient_id: ctxFields.patient_id,
      };

      const record = await Attachment.create(recordData);
      uploadedFiles.push(toClientAttachment(record));
    }

    const ctx = auditContextFromReq(req, {
      count: uploadedFiles.length,
      file_names: uploadedFiles.map((f) => f.file_name),
      resource_type: ctxFields.resource_type,
      resource_id: ctxFields.resource_id,
      patient_id: ctxFields.patient_id,
      outcome: "success",
    });
    await logAudit({
      actorUserId: req.user?.user_id,
      action: "attachment_upload",
      resourceType: "attachment",
      resourceId: uploadedFiles[0]?.attachment_id || null,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Files uploaded successfully",
      attachments: uploadedFiles,
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const downloadAttachment = async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const file = await Attachment.findByPk(attachment_id);
    await attachmentAccess.assertCanAccessAttachment(req.user, file, "read");

    const absolutePath = resolveStoredPath(file.file_path);
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    return res.download(absolutePath, file.file_name);
  } catch (error) {
    return sendError(res, error, req);
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const file = await Attachment.findByPk(attachment_id);
    await attachmentAccess.assertCanAccessAttachment(req.user, file, "delete");

    const absolutePath = resolveStoredPath(file.file_path);
    if (absolutePath && fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await file.destroy();

    const ctx = auditContextFromReq(req, {
      file_name: file.file_name,
      outcome: "success",
    });
    await logAudit({
      actorUserId: req.user?.user_id,
      action: "attachment_delete",
      resourceType: "attachment",
      resourceId: attachment_id,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Attachment deleted",
      deleted_attachment: {
        attachment_id,
        file_name: file.file_name,
      },
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const getAllAttachments = async (req, res) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset || ((Number(req.query.page) || 1) - 1) * (Number(limit) || 50);
    const attachments = await attachmentAccess.listAccessibleAttachments(req.user, {
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      count: attachments.length,
      attachments: attachments.map(toClientAttachment),
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

module.exports = {
  uploadFiles,
  deleteAttachment,
  getAllAttachments,
  downloadAttachment,
};
