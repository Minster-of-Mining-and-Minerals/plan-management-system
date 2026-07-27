"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class CarePlanService {
  /**
   * Get Care Plan for an appointment.
   */
  async getCarePlan(appointmentId) {
    const carePlan = await db.ClinicalCarePlan.findOne({
      where: { appointment_id: appointmentId },
      include: [
        { model: db.User, as: "createdByStaff", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
      ],
    });
    return carePlan;
  }

  /**
   * Create or update Care Plan for an appointment.
   */
  async upsertCarePlan(appointmentId, payload, staffId) {
    const appointment = await db.StaffAppointment.findByPk(appointmentId);
    if (!appointment) {
      const err = new Error("Appointment not found");
      err.status = 404;
      throw err;
    }

    const { title, goals = [], interventions = [], patient_instructions, monitoring_schedule = [], risk_factors = [], status = "ACTIVE" } = payload;

    let carePlan = await db.ClinicalCarePlan.findOne({
      where: { appointment_id: appointmentId },
    });

    if (carePlan) {
      await carePlan.update({
        title: title || carePlan.title,
        status: status || carePlan.status,
        goals: Array.isArray(goals) ? goals : carePlan.goals,
        interventions: Array.isArray(interventions) ? interventions : carePlan.interventions,
        patient_instructions: patient_instructions !== undefined ? patient_instructions : carePlan.patient_instructions,
        monitoring_schedule: Array.isArray(monitoring_schedule) ? monitoring_schedule : carePlan.monitoring_schedule,
        risk_factors: Array.isArray(risk_factors) ? risk_factors : carePlan.risk_factors,
      });
    } else {
      carePlan = await db.ClinicalCarePlan.create({
        care_plan_id: uuidv4(),
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        created_by_staff_id: staffId,
        title: title || "General Outpatient Care Plan",
        status: status || "ACTIVE",
        goals: Array.isArray(goals) ? goals : [],
        interventions: Array.isArray(interventions) ? interventions : [],
        patient_instructions: patient_instructions || null,
        monitoring_schedule: Array.isArray(monitoring_schedule) ? monitoring_schedule : [],
        risk_factors: Array.isArray(risk_factors) ? risk_factors : [],
      });

      await appointment.update({ care_plan_id: carePlan.care_plan_id });
    }

    if (auditService?.logAudit) {
      await auditService.logAudit({
        actorUserId: staffId,
        action: "CARE_PLAN_UPDATED",
        resourceType: "ClinicalCarePlan",
        resourceId: carePlan.care_plan_id,
        details: { appointment_id: appointmentId, status: carePlan.status },
      });
    }

    return this.getCarePlan(appointmentId);
  }
}

module.exports = new CarePlanService();
