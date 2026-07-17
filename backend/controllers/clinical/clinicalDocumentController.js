"use strict";

const clinicalDocumentService = require("../../services/clinicalDocumentService");

async function listDocuments(req, res, next) {
  try {
    const { patientId } = req.query;
    if (!patientId) {
      return res.status(400).json({ error: "patientId query parameter is required" });
    }

    const isPatientPortal = req.user.account_type === "PATIENT";
    if (isPatientPortal && req.user.user_id !== patientId) {
      return res.status(403).json({ error: "Access denied: cannot view another patient's documents" });
    }

    const docs = await clinicalDocumentService.listForPatient(patientId, { isPatientPortal });
    return res.json(docs);
  } catch (err) {
    next(err);
  }
}

async function getDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const docWithHistory = await clinicalDocumentService.getDocumentWithHistory(documentId);
    if (!docWithHistory) {
      return res.status(404).json({ error: "Clinical document not found" });
    }

    const isPatientPortal = req.user.account_type === "PATIENT";
    if (isPatientPortal) {
      if (docWithHistory.current.patient_id !== req.user.user_id) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (docWithHistory.current.status !== "final") {
        return res.status(403).json({ error: "Access denied to draft records" });
      }
    }

    return res.json(docWithHistory);
  } catch (err) {
    next(err);
  }
}

async function createDocument(req, res, next) {
  try {
    if (req.user.account_type === "PATIENT") {
      return res.status(403).json({ error: "Patients are not authorized to create clinical documents" });
    }
    const doc = await clinicalDocumentService.createDocument(req.body, req.user.user_id);
    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

async function updateDocument(req, res, next) {
  try {
    if (req.user.account_type === "PATIENT") {
      return res.status(403).json({ error: "Patients are not authorized to update clinical documents" });
    }
    const { documentId } = req.params;
    const doc = await clinicalDocumentService.updateDocument(documentId, req.body, req.user.user_id);
    return res.json(doc);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
};
