"use strict";

const { Attachment } = require("../../models");
const path = require("path");
const fs = require("fs");

function attachmentDownloadPath(attachmentId) {
  return `/api/attachments/${attachmentId}/file`;
}

function toClientAttachment(record) {
  return {
    attachment_id: record.attachment_id,
    file_name: record.file_name,
    uploaded_by: record.uploaded_by,
    created_at: record.created_at,
    download_url: attachmentDownloadPath(record.attachment_id),
  };
}

function resolveStoredPath(filePath) {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(process.cwd(), filePath);
}

// ================================
// UPLOAD FILES (no issue linked)
// ================================
const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
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
      };

      if (req.user && req.user.user_id) {
        recordData.uploaded_by = req.user.user_id;
      }

      const record = await Attachment.create(recordData);
      uploadedFiles.push(toClientAttachment(record));
    }

    return res.status(201).json({
      success: true,
      message: "Files uploaded successfully",
      attachments: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading files",
      error: error.message,
    });
  }
};

// ================================
// DOWNLOAD FILE BY ATTACHMENT ID
// ================================
const downloadAttachment = async (req, res) => {
  try {
    const { attachment_id } = req.params;
    const file = await Attachment.findByPk(attachment_id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const absolutePath = resolveStoredPath(file.file_path);
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "File missing on disk",
      });
    }

    return res.download(absolutePath, file.file_name);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({
      success: false,
      message: "Error downloading attachment",
      error: error.message,
    });
  }
};

// ================================
// DELETE FILE BY ATTACHMENT ID
// ================================
const deleteAttachment = async (req, res) => {
  try {
    const { attachment_id } = req.params;

    const file = await Attachment.findByPk(attachment_id);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const absolutePath = resolveStoredPath(file.file_path);
    if (absolutePath && fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await file.destroy();

    return res.status(200).json({
      success: true,
      message: "Attachment deleted",
      deleted_attachment: {
        attachment_id,
        file_name: file.file_name,
      },
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting attachment",
      error: error.message,
    });
  }
};

// ================================
// GET ATTACHMENT LIST
// ================================
const getAllAttachments = async (req, res) => {
  try {
    const attachments = await Attachment.findAll({
      order: [["created_at", "DESC"]],
      attributes: [
        "attachment_id",
        "file_name",
        "uploaded_by",
        "created_at",
      ],
    });

    return res.status(200).json({
      success: true,
      count: attachments.length,
      attachments: attachments.map(toClientAttachment),
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching attachments",
      error: error.message,
    });
  }
};

module.exports = {
  uploadFiles,
  deleteAttachment,
  getAllAttachments,
  downloadAttachment,
};
