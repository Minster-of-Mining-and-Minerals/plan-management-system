const express = require("express");
const router = express.Router();

const upload = require("../../middlewares/uploadMiddleware");
const {
  uploadFiles,
  getAllAttachments,
  deleteAttachment,
} = require("../../controllers/attachment-controller/attachmentController");

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
router.post("/", upload.array("files", 10), uploadFiles);

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
router.get("/", getAllAttachments);

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
router.delete("/:attachment_id", deleteAttachment);

module.exports = router;
