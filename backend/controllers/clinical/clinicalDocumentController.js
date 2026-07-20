"use strict";

const clinicalDocumentService = require("../../services/clinicalDocumentService");
const clinicalDocumentPrintService = require("../../services/clinicalDocumentPrintService");

async function listDocuments(req, res, next) {
  try {
    const isPatientPortal = req.user.account_type === "PATIENT";
    const patientId = isPatientPortal ? req.user.user_id : req.query.patient_id;

    const filters = {
      patient_id: patientId || undefined,
      appointment_id: req.query.appointment_id || undefined,
      form_config_id: req.query.form_config_id || undefined,
      created_by: req.query.created_by || undefined,
      status: req.query.status || undefined,
      date_from: req.query.date_from || undefined,
      date_to: req.query.date_to || undefined,
      keyword: req.query.keyword || undefined,
      isPatientPortal,
    };

    const docs = await clinicalDocumentService.listDocuments(filters, req.user.user_id);
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
      const isFinal = docWithHistory.current.status === "final" || docWithHistory.current.status === "finalized";
      if (!isFinal) {
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

async function signDocument(req, res, next) {
  try {
    if (req.user.account_type === "PATIENT") {
      return res.status(403).json({ error: "Patients are not authorized to sign clinical documents" });
    }
    const { documentId } = req.params;
    const doc = await clinicalDocumentService.signDocument(documentId, req.body, req.user.user_id);
    return res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function transitionStatus(req, res, next) {
  try {
    if (req.user.account_type === "PATIENT") {
      return res.status(403).json({ error: "Patients are not authorized to change document status" });
    }
    const { documentId } = req.params;
    const { status, assignee_id } = req.body;
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }
    const doc = await clinicalDocumentService.transitionStatus(
      documentId,
      status,
      req.user.user_id,
      { assignee_id }
    );
    return res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function printDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const isPatientPortal = req.user.account_type === "PATIENT";

    const docWithHistory = await clinicalDocumentService.getDocumentWithHistory(documentId);
    if (!docWithHistory) {
      return res.status(404).json({ error: "Clinical document not found" });
    }

    if (isPatientPortal) {
      if (docWithHistory.current.patient_id !== req.user.user_id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const isFinal = docWithHistory.current.status === "final" || docWithHistory.current.status === "finalized";
      if (!isFinal) {
        return res.status(403).json({ error: "Access denied to draft records" });
      }
    }

    const html = await clinicalDocumentPrintService.renderPrintHtml(documentId);
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  signDocument,
  transitionStatus,
  printDocument,
};
