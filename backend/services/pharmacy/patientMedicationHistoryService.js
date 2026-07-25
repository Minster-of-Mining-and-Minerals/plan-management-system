"use strict";

const db = require("../../models");

class PatientMedicationHistoryService {
  /**
   * Fetch complete longitudinal medication record for patient chart.
   */
  async getLongitudinalMedicationHistory(patientId) {
    const prescriptions = await db.Prescription.findAll({
      where: { patient_id: patientId },
      include: [{ model: db.PrescriptionItem, as: "items" }],
      order: [["created_at", "DESC"]],
    });

    const marRecords = await db.MedicationAdministration.findAll({
      where: { patient_id: patientId },
      include: [{ model: db.MedicationCatalog, as: "medicationCatalog" }],
      order: [["scheduled_time", "DESC"]],
    });

    const activePrescriptions = [];
    const discontinuedPrescriptions = [];

    for (const rx of prescriptions) {
      if (rx.status === "cancelled" || rx.status === "discontinued") {
        discontinuedPrescriptions.push(rx.get({ plain: true }));
      } else {
        activePrescriptions.push(rx.get({ plain: true }));
      }
    }

    return {
      patient_id: patientId,
      active_medications: activePrescriptions,
      discontinued_medications: discontinuedPrescriptions,
      mar_administrations: marRecords.map((m) => m.get({ plain: true })),
      total_prescriptions_count: prescriptions.length,
    };
  }
}

module.exports = new PatientMedicationHistoryService();
