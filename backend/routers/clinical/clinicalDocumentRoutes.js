"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/clinical/clinicalDocumentController");
const { authenticateToken } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/", controller.listDocuments);
router.get("/:documentId", controller.getDocument);
router.post("/", controller.createDocument);
router.put("/:documentId", controller.updateDocument);
router.post("/:documentId/sign", controller.signDocument);
router.post("/:documentId/transition", controller.transitionStatus);
router.get("/:documentId/print", controller.printDocument);

module.exports = router;
