const express = require("express");
const router = express.Router();

const upload = require("../../middlewares/uploadMiddleware");
const {
  authenticateToken,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");
const {
  uploadFiles,
  getAllAttachments,
  deleteAttachment,
} = require("../../controllers/attachment-controller/attachmentController");

router.use(authenticateToken);

router.post(
  "/",
  checkAnyPermission([
    { resource: "issues", action: "create" },
    { resource: "issues", action: "read_all" },
    { resource: "regions", action: "create" },
    { resource: "regions", action: "update" },
    { resource: "regions", action: "manage" },
    { resource: "regional_branding", action: "update" },
    { resource: "regional_branding", action: "read" },
    { resource: "regional_branding", action: "manage" },
    { resource: "company_branding", action: "update" },
    { resource: "company_branding", action: "read" },
    { resource: "company_branding", action: "manage" },
    { resource: "companies", action: "create" },
    { resource: "companies", action: "update" },
    { resource: "companies", action: "manage" },
    { resource: "purchasing_center_branding", action: "update" },
    { resource: "purchasing_center_branding", action: "read" },
    { resource: "purchasing_center_branding", action: "manage" },
    { resource: "purchasing_centers", action: "create" },
    { resource: "purchasing_centers", action: "update" },
    { resource: "purchasing_centers", action: "manage" },
    { resource: "government_structures", action: "create" },
    { resource: "government_structures", action: "update" },
    { resource: "branding_settings", action: "read" },
    { resource: "branding_settings", action: "update" },
    { resource: "branding_settings", action: "manage" },
    { resource: "users", action: "update" },
    { resource: "users", action: "manage" },
    { resource: "documents", action: "create" },
    { resource: "documents", action: "update" },
    { resource: "documents", action: "manage" },
    { resource: "regional_issues", action: "create" },
    { resource: "regional_issues", action: "edit" },
    { resource: "regional_issues", action: "comment" },
    { resource: "regional_issues", action: "manage" },
  ]),
  upload.array("files", 10),
  uploadFiles
);

router.get(
  "/",
  checkAnyPermission([
    { resource: "issues", action: "read" },
    { resource: "issues", action: "read_all" },
    { resource: "regional_branding", action: "read" },
    { resource: "regional_branding", action: "update" },
    { resource: "company_branding", action: "read" },
    { resource: "company_branding", action: "update" },
    { resource: "purchasing_center_branding", action: "read" },
    { resource: "purchasing_center_branding", action: "update" },
    { resource: "branding_settings", action: "read" },
    { resource: "branding_settings", action: "update" },
    { resource: "documents", action: "read" },
    { resource: "regional_issues", action: "read" },
    { resource: "regional_issues", action: "read_all" },
  ]),
  getAllAttachments
);

router.delete(
  "/:attachment_id",
  checkAnyPermission([
    { resource: "issues", action: "read_all" },
    { resource: "issues", action: "resolve" },
    { resource: "regional_branding", action: "update" },
    { resource: "regional_branding", action: "manage" },
    { resource: "company_branding", action: "update" },
    { resource: "company_branding", action: "manage" },
    { resource: "purchasing_center_branding", action: "update" },
    { resource: "purchasing_center_branding", action: "manage" },
    { resource: "branding_settings", action: "update" },
    { resource: "branding_settings", action: "manage" },
    { resource: "regions", action: "manage" },
    { resource: "companies", action: "manage" },
    { resource: "purchasing_centers", action: "manage" },
    { resource: "documents", action: "delete" },
    { resource: "documents", action: "manage" },
    { resource: "regional_issues", action: "manage" },
  ]),
  deleteAttachment
);

/**
 * @swagger
 * /api/attachments:
 *   post:
 *     summary: Upload multiple files
 *     description: Upload multiple files to the server without linking to any issue yet. Returns the uploaded attachment IDs.
 *     tags:
 *       - Attachments
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload (max 10 files)
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 attachments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       attachment_id:
 *                         type: string
 *                         format: uuid
 *                       file_name:
 *                         type: string
 *                       file_path:
 *                         type: string
 *       400:
 *         description: No files uploaded or bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/attachments:
 *   get:
 *     summary: Get all uploaded attachments
 *     description: Retrieve all attachments uploaded to the system
 *     tags:
 *       - Attachments
 *     responses:
 *       200:
 *         description: List of attachments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 attachments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       attachment_id:
 *                         type: string
 *                         format: uuid
 *                       file_name:
 *                         type: string
 *                       file_path:
 *                         type: string
 *                       uploaded_by:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/attachments/{attachment_id}:
 *   delete:
 *     summary: Delete a single attachment by ID
 *     description: Deletes an attachment from both the database and local storage
 *     tags:
 *       - Attachments
 *     parameters:
 *       - name: attachment_id
 *         in: path
 *         required: true
 *         description: Unique ID of the attachment to delete
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deleted_attachment:
 *                   type: object
 *                   properties:
 *                     attachment_id:
 *                       type: string
 *                     file_name:
 *                       type: string
 *       400:
 *         description: Missing or invalid attachment_id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Attachment not found
 *       500:
 *         description: Internal server error
 */

module.exports = router;
