"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const timelineEventService = require("../services/timelineEventService");
const clinicalRuleEngineService = require("../services/clinicalRuleEngineService");
const clinicalDocumentService = require("../services/clinicalDocumentService");

describe("Clinical Platform Foundation Integration Tests", () => {
  let patientId;
  let staffId;
  let formConfigId;

  beforeAll(async () => {
    // Fetch a user from the DB to act as the patient and staff
    const user = await db.User.findOne({ where: { account_type: "PATIENT" } });
    patientId = user ? user.user_id : uuidv4();

    const staff = await db.User.findOne({ where: { account_type: "INTERNAL" } });
    staffId = staff ? staff.user_id : uuidv4();

    const formConfig = await db.DiagnosisFormConfig.findOne();
    formConfigId = formConfig ? formConfig.config_id : null;
  });

  describe("Timeline Event Engine", () => {
    it("should emit a timeline event successfully", async () => {
      const eventData = {
        patient_id: patientId,
        event_type: "VITALS_RECORDED",
        title: "Vitals Recorded",
        description: "BP 120/80, Temp 37C",
        actor_id: staffId,
        metadata: { systolic: 120, diastolic: 80 },
      };

      const event = await timelineEventService.emit(eventData);
      expect(event).toBeDefined();
      expect(event.event_id).toBeDefined();
      expect(event.event_type).toBe("VITALS_RECORDED");
      expect(event.patient_id).toBe(patientId);
    });

    it("should retrieve a patient's chronological timeline", async () => {
      const events = await timelineEventService.listForPatient(patientId);
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      
      // Ensure chronological ordering (most recent first)
      if (events.length > 1) {
        const firstTime = new Date(events[0].event_date).getTime();
        const secondTime = new Date(events[1].event_date).getTime();
        expect(firstTime).toBeGreaterThanOrEqual(secondTime);
      }
    });
  });

  describe("Clinical Rule Engine", () => {
    it("should detect a drug allergy warning", async () => {
      // Register a mock patient allergy
      const allergy = await db.PatientAllergy.create({
        allergy_id: uuidv4(),
        patient_id: patientId,
        allergen: "Penicillin",
        severity: "CRITICAL",
        reaction: "Anaphylaxis",
        created_by: staffId,
      });

      const contextData = {
        patient_id: patientId,
        prescriptions: [{ drug_name: "Penicillin G" }],
        allergies: [allergy],
      };

      const alerts = await clinicalRuleEngineService.evaluateRules("PRESCRIPTION_CREATE", contextData);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].message).toContain("Allergy Warning");
      expect(alerts[0].severity).toBe("CRITICAL");

      // Clean up mock allergy
      await allergy.destroy();
    });

    it("should detect a drug-drug interaction warning", async () => {
      const contextData = {
        prescriptions: [
          { drug_name: "Warfarin Sodium" },
          { drug_name: "Ibuprofen 400mg" },
        ],
      };

      const alerts = await clinicalRuleEngineService.evaluateRules("PRESCRIPTION_CREATE", contextData);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].message).toContain("Drug Interaction");
      expect(alerts[0].message).toContain("bleeding risk");
    });

    it("should detect a duplicate drug prescription", async () => {
      const contextData = {
        prescriptions: [
          { drug_name: "Amoxicillin 500mg" },
          { drug_name: "Amoxicillin 500mg" },
        ],
      };

      const alerts = await clinicalRuleEngineService.evaluateRules("PRESCRIPTION_CREATE", contextData);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].message).toContain("Duplicate Medication");
    });
  });

  describe("Clinical Templates & Versioning", () => {
    it("should create, save, and version clinical documents", async () => {
      if (!formConfigId) return; // skip if no dynamic form config seeded

      const docData = {
        patient_id: patientId,
        document_type: "SOAP",
        title: "Initial Consultation Note",
        form_config_id: formConfigId,
        form_data: { subjective: "Complaining of eye pain", objective: "Redness present" },
        status: "draft",
      };

      // 1. Create a draft document
      const doc = await clinicalDocumentService.createDocument(docData, staffId);
      expect(doc).toBeDefined();
      expect(doc.version).toBe(1);
      expect(doc.status).toBe("draft");

      // 2. Finalize the draft
      const finalized = await clinicalDocumentService.updateDocument(doc.document_id, { status: "final" }, staffId);
      expect(finalized.status).toBe("final");
      expect(finalized.version).toBe(1);

      // 3. Edit the finalized document (should trigger version 2 creation)
      const revised = await clinicalDocumentService.updateDocument(
        doc.document_id,
        {
          title: "Initial Consultation Note - Updated",
          form_data: { subjective: "Complaining of severe eye pain", objective: "Redness resolved" },
          status: "final",
        },
        staffId
      );

      expect(revised.document_id).not.toBe(doc.document_id); // Different primary key
      expect(revised.version).toBe(2);
      expect(revised.parent_document_id).toBe(doc.document_id);

      // Verify history logs
      const historyRes = await clinicalDocumentService.getDocumentWithHistory(revised.document_id);
      expect(historyRes.history.length).toBe(2);
      expect(historyRes.history[0].version).toBe(1);
      expect(historyRes.history[1].version).toBe(2);

      // Cleanup
      await db.ClinicalDocument.destroy({
        where: {
          [db.Sequelize.Op.or]: [
            { document_id: doc.document_id },
            { document_id: revised.document_id },
          ],
        },
      });
    });
  });
});
