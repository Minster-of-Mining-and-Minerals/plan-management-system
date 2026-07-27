"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class PatientLocationService {
  /**
   * List available locations.
   */
  async listLocations() {
    return db.PatientLocation.findAll({
      where: { is_active: true },
      order: [["display_name", "ASC"]],
    });
  }

  /**
   * Assign or update patient location for an appointment.
   */
  async assignLocation({ appointment_id, patient_id, location_id, display_name, notes }, staffId) {
    const appointment = await db.StaffAppointment.findByPk(appointment_id);
    if (!appointment) {
      const err = new Error("Appointment not found");
      err.status = 404;
      throw err;
    }

    let resolvedLocationId = location_id || null;
    let resolvedDisplayName = display_name;

    if (location_id && !resolvedDisplayName) {
      const loc = await db.PatientLocation.findByPk(location_id);
      if (loc) resolvedDisplayName = loc.display_name;
    }

    if (!resolvedDisplayName) {
      resolvedDisplayName = "Unassigned Location";
    }

    const history = await db.PatientLocationHistory.create({
      history_id: uuidv4(),
      appointment_id,
      patient_id: patient_id || appointment.patient_id,
      location_id: resolvedLocationId,
      assigned_by_staff_id: staffId,
      location_name: resolvedDisplayName,
      notes: notes || null,
    });

    await appointment.update({ current_location_id: resolvedLocationId });

    if (auditService?.logAudit) {
      await auditService.logAudit({
        actorUserId: staffId,
        action: "PATIENT_LOCATION_UPDATED",
        resourceType: "StaffAppointment",
        resourceId: appointment_id,
        details: { location_name: resolvedDisplayName, location_id: resolvedLocationId },
      });
    }

    return history;
  }

  /**
   * Get location history for an appointment.
   */
  async getLocationHistory(appointmentId) {
    return db.PatientLocationHistory.findAll({
      where: { appointment_id: appointmentId },
      include: [
        { model: db.User, as: "assignedByStaff", attributes: ["user_id", "full_name"] },
        { model: db.PatientLocation, as: "location" },
      ],
      order: [["created_at", "DESC"]],
    });
  }
}

module.exports = new PatientLocationService();
