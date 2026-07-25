"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const pharmacyService = require("../services/pharmacyService");
const medicationCatalogService = require("../services/medication/medicationCatalogService");
const pharmacyInventoryService = require("../services/pharmacy/pharmacyInventoryService");
const pharmacyControlledMedicationService = require("../services/pharmacy/pharmacyControlledMedicationService");
const pharmacyExpiryService = require("../services/pharmacy/pharmacyExpiryService");
const pharmacyInventoryAnalyticsService = require("../services/pharmacy/pharmacyInventoryAnalyticsService");
const pharmacySubstitutionService = require("../services/pharmacy/pharmacySubstitutionService");
const prescriptionService = require("../services/prescriptionService");
const pharmacyClinicalIntegrationService = require("../services/pharmacyClinicalIntegrationService");

jest.setTimeout(30000);

describe("Phase 2.8.3 — Pharmacy Inventory, Controlled Medication & Commercial Billing Engine", () => {
  let patientId;
  let doctorId;
  let dispenserId;
  let verifierId;
  let appointmentId;
  let pharmacyId;
  let warehouseId;
  let medicationCatalogId;
  let batchId;
  let prescriptionId;
  let clinicalOrderId;

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
      appointment_type: "Pharmacy Inventory Encounter",
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
      notes: "Encounter for Inventory & Billing Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.PharmacyWarehouse.sync({ alter: true });
    await db.MedicationCatalog.sync({ alter: true });
    await db.MedicationBatch.sync({ alter: true });
    await db.PharmacyStockTransaction.sync({ alter: true });
    await db.MedicationSubstitutionRequest.sync({ alter: true });
    await db.ControlledMedicationLog.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Inventory Test Patient",
      email: `inv_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Inventory Lead",
      email: `inv_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const dispenser = await db.User.create({
      user_id: uuidv4(),
      full_name: "Pharmacist Dispenser",
      email: `pharm_disp_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PHARMACY",
      is_active: true,
    });
    dispenserId = dispenser.user_id;

    const verifier = await db.User.create({
      user_id: uuidv4(),
      full_name: "Lead Pharmacist Verifier",
      email: `pharm_ver_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PHARMACY",
      is_active: true,
    });
    verifierId = verifier.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const pharmacy = await pharmacyService.createPharmacy(
      {
        pharmacy_name: `Inventory Test Pharmacy ${uuidv4().slice(0, 4)}`,
        pharmacy_code: `PHARM-INV-${uuidv4().slice(0, 4).toUpperCase()}`,
        phone: "+1-555-0399",
      },
      doctorId
    );
    pharmacyId = pharmacy.pharmacy_id;

    const catalogMed = await medicationCatalogService.createMedication({
      generic_name: `Azithromycin ${uuidv4().slice(0, 4)}`,
      brand_name: "Zithromax",
      dosage_form: "Tablet",
      strength: "500mg",
      controlled_status: "CONTROLLED_SCHEDULE_IV",
    });
    medicationCatalogId = catalogMed.id;

    const rx = await prescriptionService.createPrescription(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        header_title: "Inventory Test Prescription",
        signature_type: "template",
        items: [
          { item_name: "Azithromycin 500mg", dosage: "500mg", quantity: "5" },
        ],
      },
      doctorId
    );
    prescriptionId = rx.prescription_id;

    const order = await pharmacyClinicalIntegrationService.createPharmacyOrder(prescriptionId, doctorId);
    clinicalOrderId = order.order_id;
  });

  describe("1. Pharmacy Warehouse Foundation & Stock Reception", () => {
    it("should create a pharmacy storage warehouse location", async () => {
      const warehouse = await pharmacyInventoryService.createWarehouse(
        pharmacyId,
        { warehouse_name: "Central Cold Storage", location: "Floor 1 Wing B" },
        dispenserId
      );

      expect(warehouse).toBeDefined();
      expect(warehouse.pharmacy_id).toBe(pharmacyId);
      expect(warehouse.warehouse_name).toBe("Central Cold Storage");
      warehouseId = warehouse.id;
    });

    it("should receive a new medication stock batch into inventory", async () => {
      const batch = await pharmacyInventoryService.receiveMedicationStock(
        pharmacyId,
        {
          warehouse_id: warehouseId,
          medication_catalog_id: medicationCatalogId,
          batch_number: `BATCH-AZ-${uuidv4().slice(0, 4)}`,
          manufacturer: "Pfizer Global",
          expiry_date: "2028-12-31",
          quantity_received: 100,
          unit_cost: 4.5,
          selling_price: 12.0,
        },
        dispenserId
      );

      expect(batch).toBeDefined();
      expect(batch.quantity_available).toBe(100);
      expect(batch.status).toBe("ACTIVE");
      batchId = batch.id;
    });
  });

  describe("2. Batch Allocation & Stock Deduction during Dispensing", () => {
    it("should allocate and deduct stock during dispensing", async () => {
      const allocation = await pharmacyInventoryService.allocateMedicationForDispensing(
        pharmacyId,
        medicationCatalogId,
        5,
        clinicalOrderId,
        dispenserId
      );

      expect(allocation.batch.quantity_available).toBe(95);
      expect(allocation.transaction.transaction_type).toBe("DISPENSED");
      expect(allocation.transaction.quantity).toBe(-5);
    });

    it("should prevent dispensing when requested quantity exceeds available stock", async () => {
      await expect(
        pharmacyInventoryService.allocateMedicationForDispensing(
          pharmacyId,
          medicationCatalogId,
          999, // Exceeds 95 available
          clinicalOrderId,
          dispenserId
        )
      ).rejects.toThrow("Insufficient available stock batch");
    });
  });

  describe("3. Controlled Medication Verification & Dual-Signing Log", () => {
    it("should log controlled medication dispensing with dual verification signature", async () => {
      const log = await pharmacyControlledMedicationService.logControlledDispensing({
        batchId,
        patientId,
        prescriptionId,
        quantity: 5,
        dispenserId,
        verifierId,
        digitalSignature: `SIG-RSA-VERIFIED-${uuidv4().slice(0, 6)}`,
      });

      expect(log).toBeDefined();
      expect(log.dispensed_by).toBe(dispenserId);
      expect(log.verified_by).toBe(verifierId);
      expect(log.digital_signature).toContain("SIG-RSA-VERIFIED");
    });

    it("should reject controlled drug verification if dispenser and verifier are identical", async () => {
      await expect(
        pharmacyControlledMedicationService.logControlledDispensing({
          batchId,
          patientId,
          prescriptionId,
          quantity: 5,
          dispenserId,
          verifierId: dispenserId, // Same ID
        })
      ).rejects.toThrow("Controlled drug dispensing requires dual verification");
    });
  });

  describe("4. Expiry Management & Inventory Analytics", () => {
    it("should calculate pharmacy inventory analytics and stock value", async () => {
      const analytics = await pharmacyInventoryAnalyticsService.getInventoryAnalytics(pharmacyId);

      expect(analytics).toBeDefined();
      expect(analytics.pharmacy_id).toBe(pharmacyId);
      expect(analytics.total_stock_value).toBeGreaterThan(0);
      expect(analytics.total_dispensing_transactions).toBeGreaterThanOrEqual(1);
    });

    it("should identify expiring medication batches and quarantine expired stock", async () => {
      // Receive an expired batch to test quarantine
      const expiredBatch = await pharmacyInventoryService.receiveMedicationStock(
        pharmacyId,
        {
          medication_catalog_id: medicationCatalogId,
          batch_number: `EXPIRED-${uuidv4().slice(0, 4)}`,
          expiry_date: "2020-01-01", // Past date
          quantity_received: 20,
        },
        dispenserId
      );

      const quarantineRes = await pharmacyExpiryService.quarantineExpiredMedication(pharmacyId, dispenserId);
      expect(quarantineRes.quarantinedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("5. Medication Substitution Governance", () => {
    it("should process pharmacist substitution request and doctor approval", async () => {
      const pharmacyRx = await db.PharmacyPrescription.create({
        pharmacy_prescription_id: uuidv4(),
        pharmacy_id: pharmacyId,
        prescription_id: prescriptionId,
        original_prescription_id: prescriptionId,
        patient_id: patientId,
        prescriber_id: doctorId,
        pharmacy_status: "received",
      });

      const pharmacyRxItem = await db.PharmacyPrescriptionItem.create({
        pharmacy_prescription_item_id: uuidv4(),
        pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
        item_name: "Original Drug A",
        quantity: "10",
      });

      const targetMed = await medicationCatalogService.createMedication({
        generic_name: `Alternative Drug ${uuidv4().slice(0, 4)}`,
      });

      const subReq = await pharmacySubstitutionService.createSubstitutionRequest(
        {
          pharmacy_prescription_item_id: pharmacyRxItem.pharmacy_prescription_item_id,
          requested_medication_id: targetMed.id,
          reason: "Original medication out of stock. Generic equivalent proposed.",
        },
        dispenserId
      );

      expect(subReq.status).toBe("REQUESTED");

      const approved = await pharmacySubstitutionService.approveSubstitutionRequest(subReq.id, doctorId);
      expect(approved.status).toBe("APPROVED");
      expect(approved.approved_by).toBe(doctorId);
    });
  });
});
