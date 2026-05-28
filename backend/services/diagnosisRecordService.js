"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { validateDiagnosisFormData } = require("./dynamicDiagnosisValidationService");
const diagnosisFormConfigService = require("./diagnosisFormConfigService");

async function getAppointmentForStaff(appointmentId, staffId) {
  const appointment = await db.StaffAppointment.findOne({
    where: {
      appointment_id: appointmentId,
      assigned_staff_id: staffId,
    },
    include: [
      {
        model: db.User,
        as: "patient",
        attributes: ["user_id", "full_name"],
      },
    ],
  });

  if (!appointment) {
    const err = new Error("Appointment not found");
    err.status = 404;
    throw err;
  }

  return appointment;
}

async function getRecordByAppointment(appointmentId, staffId) {
  const appointment = await getAppointmentForStaff(appointmentId, staffId);
  const { config, form } = await diagnosisFormConfigService.getOrCreateConfigForStaff(
    staffId
  );

  let record = await db.DiagnosisRecord.findOne({
    where: { appointment_id: appointmentId },
  });

  return {
    appointment: appointment.get({ plain: true }),
    formConfig: config,
    form,
    record: record ? record.get({ plain: true }) : null,
  };
}

async function saveRecord(appointmentId, staffId, { form_data, status = "submitted" }) {
  const appointment = await getAppointmentForStaff(appointmentId, staffId);
  const { config } = await diagnosisFormConfigService.getOrCreateConfigForStaff(staffId);

  const normalized = await validateDiagnosisFormData(config.config_id, form_data, {
    partial: false,
  });

  let record = await db.DiagnosisRecord.findOne({
    where: { appointment_id: appointmentId },
  });

  if (record) {
    await record.update({
      form_data: normalized,
      status,
      form_config_id: config.config_id,
    });
  } else {
    record = await db.DiagnosisRecord.create({
      diagnosis_id: uuidv4(),
      patient_id: appointment.patient_id,
      appointment_id: appointment.appointment_id,
      assigned_staff_id: staffId,
      form_config_id: config.config_id,
      form_data: normalized,
      status,
    });
  }

  return record.get({ plain: true });
}

module.exports = {
  getRecordByAppointment,
  saveRecord,
};
