"use strict";

const express = require("express");
const router = express.Router();

const upload = require("../../middlewares/uploadMiddleware");
const {
  uploadFiles,
  getAllAttachments,
  deleteAttachment,
  downloadAttachment,
} = require("../../controllers/attachment-controller/attachmentController");
const { authenticateToken } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.post("/", upload.array("files", 10), uploadFiles);
router.get("/", getAllAttachments);
router.get("/:attachment_id/file", downloadAttachment);
router.delete("/:attachment_id", deleteAttachment);

module.exports = router;
