"use strict";

const db = require("../../models");

class ClinicalPatientContextService {
  /**
   * Build a unified patient intelligence snapshot across all clinical domains.
   */
  async getPatientSnapshot(patientId) {
    if (!patientId) throw Object.assign(new Error("patientId is required"), { status: 400 });

    const [
      profile,
      allergies,
      activeMedications,
      recentLabResults,
      recentRadiologyReports,
      activeProblems,
      openAlerts,
    ] = await Promise.all([
      this._getPatientProfile(patientId),
      this._getAllergies(patientId),
      this._getActiveMedications(patientId),
      this._getRecentLabResults(patientId),
      this._getRecentRadiologyReports(patientId),
      this._getActiveProblems(patientId),
      this._getOpenAlerts(patientId),
    ]);

    return {
      patient_id: patientId,
      generated_at: new Date().toISOString(),
      demographics: profile,
      allergies,
      active_medications: activeMedications,
      recent_lab_results: recentLabResults,
      recent_radiology_reports: recentRadiologyReports,
      active_problems: activeProblems,
      open_alerts: openAlerts,
    };
  }

  async _getPatientProfile(patientId) {
    try {
      const profile = await db.PatientProfile.findOne({
        where: { user_id: patientId },
        include: [{ model: db.User, as: "user", attributes: ["user_id", "full_name", "email"] }],
      });
      if (!profile) return { user_id: patientId };
      const p = profile.get({ plain: true });
      return {
        full_name: p.user?.full_name,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        blood_group: p.blood_group,
        marital_status: p.marital_status,
        nationality: p.nationality,
        patient_status: p.patient_status,
        medical_history_summary: p.medical_history_summary,
        insurance_profile: p.insurance_profile,
      };
    } catch {
      return {};
    }
  }

  async _getAllergies(patientId) {
    try {
      const records = await db.PatientAllergy.findAll({ where: { patient_id: patientId } });
      return records.map((r) => r.get({ plain: true }));
    } catch {
      return [];
    }
  }

  async _getActiveMedications(patientId) {
    try {
      const prescriptions = await db.Prescription.findAll({
        where: { patient_id: patientId, status: "active" },
        include: [{ model: db.PrescriptionItem, as: "items" }],
        order: [["created_at", "DESC"]],
        limit: 20,
      });
      return prescriptions.map((p) => p.get({ plain: true }));
    } catch {
      return [];
    }
  }

  async _getRecentLabResults(patientId) {
    try {
      const orders = await db.ClinicalOrder.findAll({
        where: { patient_id: patientId, order_type: "LABORATORY" },
        include: [
          {
            model: db.ClinicalOrderResult,
            as: "result",
            where: { result_status: "VERIFIED" },
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 10,
      });

      const observationArrays = await Promise.all(
        orders.map(async (o) => {
          try {
            const obs = await db.LaboratoryObservation.findAll({
              where: { order_id: o.order_id },
              limit: 5,
            });
            return obs.map((ob) => ob.get({ plain: true }));
          } catch {
            return [];
          }
        })
      );

      return observationArrays.flat().slice(0, 20);
    } catch {
      return [];
    }
  }

  async _getRecentRadiologyReports(patientId) {
    try {
      const orders = await db.ClinicalOrder.findAll({
        where: { patient_id: patientId, order_type: "RADIOLOGY" },
        include: [
          {
            model: db.RadiologyReport,
            as: "result",
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 5,
      });
      return orders
        .filter((o) => o.result)
        .map((o) => o.result.get({ plain: true }));
    } catch {
      return [];
    }
  }

  async _getActiveProblems(patientId) {
    try {
      const problems = await db.ClinicalProblem.findAll({
        where: { patient_id: patientId, status: "ACTIVE" },
        order: [["created_at", "DESC"]],
      });
      return problems.map((p) => p.get({ plain: true }));
    } catch {
      return [];
    }
  }

  async _getOpenAlerts(patientId) {
    try {
      const alerts = await db.ClinicalAlert.findAll({
        where: { patient_id: patientId, status: "OPEN" },
        order: [["created_at", "DESC"]],
        limit: 20,
      });
      return alerts.map((a) => a.get({ plain: true }));
    } catch {
      return [];
    }
  }
}

module.exports = new ClinicalPatientContextService();
