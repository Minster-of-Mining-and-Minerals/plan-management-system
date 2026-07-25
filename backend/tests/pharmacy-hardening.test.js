"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const pharmacyService = require("../services/pharmacyService");
const medicationCatalogService = require("../services/medication/medicationCatalogService");
const pharmacyInventoryService = require("../services/pharmacy/pharmacyInventoryService");
const pharmacyTransferService = require("../services/pharmacy/pharmacyTransferService");
const pharmacyBarcodeService = require("../services/pharmacy/pharmacyBarcodeService");
const pharmacyRefillService = require("../services/pharmacy/pharmacyRefillService");
const pharmacyAdvancedAnalyticsService = require("../services/pharmacy/pharmacyAdvancedAnalyticsService");
const prescriptionService = require("../services/prescriptionService");

jest.setTimeout(30000);

describe("Phase 2.8.4 — Pharmacy Production Hardening & Advanced Operations", () => {
  let patientId;
  let doctorId;
  let pharmacistId;
  let sourcePharmacyId;
  let destinationPharmacyId;
  let medicationCatalogId;
  let sourceBatchId;
  let prescriptionId;
  let appointmentId;
  let testBarcode;

  async function createTestEncounter(pId, dId) {
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: dId,
      schedule_date: todayStr,
      start_time: "08:00",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Hardening Test Encounter",
      created_by: dId,
      updated_by: dId,
    });

    return await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: dId,
      admitted_by: dId,
      admitted_at: new Date(),
      status: "admitted",
      notes: "Encounter for Hardening Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.PharmacyWarehouse.sync({ alter: true });
    await db.MedicationCatalog.sync({ alter: true });
    await db.MedicationBatch.sync({ alter: true });
    await db.PharmacyStockTransaction.sync({ alter: true });
    await db.PharmacyStockTransfer.sync({ alter: true });
    await db.PrescriptionRefill.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Hardening Test Patient",
      email: `hard_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Hardening Lead",
      email: `hard_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const pharmacist = await db.User.create({
      user_id: uuidv4(),
      full_name: "Lead Transfer Pharmacist",
      email: `hard_pharm_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PHARMACY",
      is_active: true,
    });
    pharmacistId = pharmacist.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const p1 = await pharmacyService.createPharmacy(
      { pharmacy_name: `Main Branch ${uuidv4().slice(0, 4)}`, pharmacy_code: `P1-${uuidv4().slice(0, 4)}` },
      doctorId
    );
    sourcePharmacyId = p1.pharmacy_id;

    const p2 = await pharmacyService.createPharmacy(
      { pharmacy_name: `North Branch ${uuidv4().slice(0, 4)}`, pharmacy_code: `P2-${uuidv4().slice(0, 4)}` },
      doctorId
    );
    destinationPharmacyId = p2.pharmacy_id;

    const med = await medicationCatalogService.createMedication({
      generic_name: `Amoxicillin ${uuidv4().slice(0, 4)}`,
      brand_name: "Amoxil",
      controlled_status: "CONTROLLED_SCHEDULE_III",
    });
    medicationCatalogId = med.id;

    const batch = await pharmacyInventoryService.receiveMedicationStock(
      sourcePharmacyId,
      {
        medication_catalog_id: medicationCatalogId,
        batch_number: `BARCODE-BATCH-${uuidv4().slice(0, 4)}`,
        expiry_date: "2029-10-10",
        quantity_received: 200,
        unit_cost: 3.0,
        selling_price: 8.0,
      },
      pharmacistId
    );
    sourceBatchId = batch.id;

    testBarcode = `BC-TEST-${uuidv4().slice(0, 8)}`;

    // Attach barcode identifier to batch
    await db.MedicationBatch.update(
      { barcode_identifier: testBarcode },
      { where: { id: sourceBatchId } }
    );

    const rx = await prescriptionService.createPrescription(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        header_title: "Refill Hardening Prescription",
        signature_type: "template",
        items: [{ item_name: "Amoxicillin 500mg", quantity: "30" }],
      },
      doctorId
    );
    prescriptionId = rx.prescription_id;
  });

  describe("1. Inter-Pharmacy Stock Transfer Lifecycle", () => {
    let transferId;

    it("should request an inter-pharmacy stock transfer", async () => {
      const transfer = await pharmacyTransferService.requestStockTransfer(
        {
          source_pharmacy_id: sourcePharmacyId,
          destination_pharmacy_id: destinationPharmacyId,
          medication_batch_id: sourceBatchId,
          quantity: 50,
        },
        pharmacistId
      );

      expect(transfer).toBeDefined();
      expect(transfer.status).toBe("TRANSIT");
      expect(transfer.quantity).toBe(50);
      transferId = transfer.id;
    });

    it("should confirm reception of stock transfer at destination pharmacy", async () => {
      const confirmed = await pharmacyTransferService.confirmStockTransfer(transferId, pharmacistId);

      expect(confirmed.status).toBe("RECEIVED");
      expect(confirmed.received_by).toBe(pharmacistId);
    });
  });

  describe("2. Barcode Medication Safety Verification", () => {
    it("should verify scanned barcode identifier against active batch", async () => {
      const verification = await pharmacyBarcodeService.verifyMedicationBarcode({
        batch_id: sourceBatchId,
        barcode_identifier: testBarcode,
        patient_id: patientId,
      });

      expect(verification.is_valid).toBe(true);
      expect(verification.status).toBe("VERIFIED");
      expect(verification.batch_id).toBe(sourceBatchId);
    });

    it("should reject verification for non-existent barcode", async () => {
      const verification = await pharmacyBarcodeService.verifyMedicationBarcode({
        barcode_identifier: "INVALID-BARCODE-9999",
      });

      expect(verification.is_valid).toBe(false);
      expect(verification.status).toBe("NOT_FOUND");
    });
  });

  describe("3. Prescription Refill Engine", () => {
    it("should process prescription refill within allowed limits", async () => {
      const refillResult = await pharmacyRefillService.processPrescriptionRefill(
        { prescription_id: prescriptionId, max_refills: 3 },
        pharmacistId
      );

      expect(refillResult.refill.refill_number).toBe(1);
      expect(refillResult.remaining_refills).toBe(2);
    });

    it("should reject refill processing when refill limit is exceeded", async () => {
      await pharmacyRefillService.processPrescriptionRefill({ prescription_id: prescriptionId, max_refills: 2 }, pharmacistId);

      await expect(
        pharmacyRefillService.processPrescriptionRefill({ prescription_id: prescriptionId, max_refills: 2 }, pharmacistId)
      ).rejects.toThrow("Prescription refill limit reached");
    });
  });

  describe("4. Advanced Clinical & Operational Analytics", () => {
    it("should calculate clinical metrics and operational metrics", async () => {
      const analytics = await pharmacyAdvancedAnalyticsService.getAdvancedAnalytics(sourcePharmacyId);

      expect(analytics).toBeDefined();
      expect(analytics.clinical_metrics.controlled_medication_count).toBeGreaterThanOrEqual(1);
      expect(analytics.operational_metrics.total_stock_transfers).toBeGreaterThanOrEqual(1);
    });
  });
});
