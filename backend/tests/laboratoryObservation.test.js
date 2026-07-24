"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const laboratoryObservationService = require("../services/laboratoryObservationService");
const laboratoryCriticalValueService = require("../services/laboratoryCriticalValueService");

describe("Phase 2.6.4 — Laboratory Result Observation Engine", () => {
  let patientId;
  let staffId;
  let appointmentId;
  let orderId;
  let resultId;

  async function createTestAppointment(pId, sId) {
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      schedule_date: todayStr,
      start_time: "07:30",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Test Lab Observation Encounter",
      created_by: sId,
      updated_by: sId,
    });

    return await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      admitted_by: sId,
      admitted_at: new Date(),
      status: "admitted",
      notes: "Test encounter for observation module",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    if (db.LaboratoryObservation) await db.LaboratoryObservation.sync({ alter: true });
    if (db.LaboratoryObservationHistory) await db.LaboratoryObservationHistory.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Observation Patient",
      email: `obs_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Observation Lab Tech",
      email: `obs_tech_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId = staff.user_id;

    const appt = await createTestAppointment(patientId, staffId);
    appointmentId = appt.appointment_id;

    const order = await clinicalOrderService.createOrder(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        order_type: "LABORATORY",
        priority: "ROUTINE",
        title: "Complete Metabolic & CBC Panel",
      },
      staffId
    );
    orderId = order.order_id;

    const completedOrder = await clinicalOrderService.recordResult(
      orderId,
      {
        result_summary: "Initial CBC & Electrolyte Panel",
        result_data: { wbc: "7.5", hgb: "14.2" },
      },
      staffId
    );
    resultId = completedOrder.result.result_id;
  });

  describe("1. Automatic Abnormal Flag Calculation", () => {
    it("should calculate NORMAL for values inside reference range", () => {
      const flag = laboratoryObservationService.calculateAbnormalFlag("7.5", 7.5, { low: 4.0, high: 10.0 });
      expect(flag).toBe("NORMAL");
    });

    it("should calculate LOW for numeric values below low threshold", () => {
      const flag = laboratoryObservationService.calculateAbnormalFlag("3.2", 3.2, { low: 4.0, high: 10.0 });
      expect(flag).toBe("LOW");
    });

    it("should calculate HIGH for numeric values above high threshold", () => {
      const flag = laboratoryObservationService.calculateAbnormalFlag("15.5", 15.5, { low: 4.0, high: 10.0 });
      expect(flag).toBe("HIGH");
    });

    it("should calculate CRITICAL_HIGH for numeric values exceeding critical high", () => {
      const flag = laboratoryObservationService.calculateAbnormalFlag("25.0", 25.0, {
        low: 4.0,
        high: 10.0,
        critical_high: 20.0,
      });
      expect(flag).toBe("CRITICAL_HIGH");
    });
  });

  describe("2. Observation Creation & Critical Value Engine", () => {
    let obsId;

    it("should create a structured laboratory observation", async () => {
      const obs = await laboratoryObservationService.createObservation(
        {
          result_id: resultId,
          order_id: orderId,
          observation_code: "WBC",
          observation_name: "White Blood Cell Count",
          value: "7.5",
          numeric_value: 7.5,
          unit: "10^3/uL",
          reference_range: { low: 4.0, high: 10.0 },
        },
        staffId
      );

      expect(obs).toBeDefined();
      expect(obs.observation_code).toBe("WBC");
      expect(obs.abnormal_flag).toBe("NORMAL");
      expect(obs.status).toBe("PRELIMINARY");
      obsId = obs.id;
    });

    it("should detect critical value and trigger critical result alerts", async () => {
      const criticalObs = await laboratoryObservationService.createObservation(
        {
          result_id: resultId,
          order_id: orderId,
          observation_code: "POTASSIUM",
          observation_name: "Serum Potassium",
          value: "6.8",
          numeric_value: 6.8,
          unit: "mEq/L",
          reference_range: { low: 3.5, high: 5.0, critical_high: 6.5 },
        },
        staffId
      );

      expect(criticalObs.abnormal_flag).toBe("CRITICAL_HIGH");

      const criticals = await laboratoryObservationService.getCriticalResults();
      expect(criticals.length).toBeGreaterThanOrEqual(1);
      expect(criticals.some((c) => c.id === criticalObs.id)).toBe(true);
    });

    it("should fetch all observations for a clinical result", async () => {
      const list = await laboratoryObservationService.getResultObservations(resultId);
      expect(list).toBeDefined();
      expect(list.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Verification & Amendment Workflow", () => {
    let obsIdToVerify;

    beforeAll(async () => {
      const obs = await laboratoryObservationService.createObservation(
        {
          result_id: resultId,
          order_id: orderId,
          observation_code: "HGB",
          observation_name: "Hemoglobin",
          value: "14.2",
          numeric_value: 14.2,
          unit: "g/dL",
          reference_range: { low: 12.0, high: 16.0 },
        },
        staffId
      );
      obsIdToVerify = obs.id;
    });

    it("should verify observation analyte result", async () => {
      const verified = await laboratoryObservationService.verifyObservation(obsIdToVerify, staffId);
      expect(verified.status).toBe("FINAL");
      expect(verified.verified_by).toBe(staffId);
    });

    it("should reject amendment if change reason is missing", async () => {
      await expect(
        laboratoryObservationService.amendObservation(obsIdToVerify, { value: "14.5" }, staffId)
      ).rejects.toThrow("Amendment reason is required");
    });

    it("should amend observation analyte result and preserve history", async () => {
      const amended = await laboratoryObservationService.amendObservation(
        obsIdToVerify,
        {
          value: "14.5",
          numeric_value: 14.5,
          change_reason: "Corrected calibration factor",
        },
        staffId
      );

      expect(amended.status).toBe("AMENDED");
      expect(amended.value).toBe("14.5");

      const list = await laboratoryObservationService.getResultObservations(resultId);
      const target = list.find((o) => o.id === obsIdToVerify);
      expect(target.amendments).toBeDefined();
      expect(target.amendments.length).toBe(1);
      expect(target.amendments[0].previous_value).toBe("14.2");
      expect(target.amendments[0].change_reason).toBe("Corrected calibration factor");
    });
  });
});
