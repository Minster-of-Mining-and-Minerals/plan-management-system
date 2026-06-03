"use strict";

const { randomBytes } = require("crypto");
const {
  MedicalCertificate,
  MedicalCertificateTemplate,
  User,
  PatientProfile,
  PatientSchedule,
  StaffAppointment,
  InternalUserProfile,
  Department,
  UserTitle,
  SystemBranding,
} = require("../models");
const medicalCertificatePrintService = require("./medicalCertificatePrintService");
const medicalCertificateWorkflowDataService = require("./medicalCertificateWorkflowDataService");
const medicalWorkflowService = require("./medicalWorkflowService");
const {
  DEFAULT_INCLUDE_OPTIONS,
  CERTIFICATE_SIGNATURE_TYPES,
} = require("../config/medicalCertificateConstants");
const {
  isValidSignaturePath,
  resolvePublicFileUrl,
} = require("../utils/resolvePublicFileUrl");

const patientInclude = [
  {
    model: PatientProfile,
    as: "patientProfile",
    attributes: [
      "patient_code",
      "date_of_birth",
      "gender",
      "sex",
    ],
  },
];

const doctorInclude = [
  {
    model: InternalUserProfile,
    as: "internalProfile",
    include: [
      { model: Department, as: "departmentRef", attributes: ["name"] },
      { model: UserTitle, as: "titleRef", attributes: ["name"] },
    ],
  },
];

const certificateInclude = [
  { model: MedicalCertificateTemplate, as: "template" },
  {
    model: User,
    as: "patient",
    attributes: ["user_id", "full_name"],
    include: patientInclude,
  },
  {
    model: User,
    as: "issuer",
    attributes: ["user_id", "full_name"],
    include: doctorInclude,
  },
  { model: PatientSchedule, as: "schedule", required: false },
  { model: StaffAppointment, as: "appointment", required: false },
];

function format(row) {
  return row.get({ plain: true });
}

function normalizeIncludeOptions(input = {}) {
  return { ...DEFAULT_INCLUDE_OPTIONS, ...input };
}

function nextCertificateNumber() {
  const year = new Date().getFullYear();
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `MC-${year}-${suffix}`;
}

function nextVerificationCode() {
  return randomBytes(6).toString("hex").toUpperCase();
}

async function getBrandingPrescriptionSignature() {
  const branding = await SystemBranding.findOne({
    where: { is_active: true },
    attributes: ["prescription_signature_file"],
    order: [["updated_at", "DESC"]],
  });
  return branding?.prescription_signature_file || null;
}

function resolveTemplateSignatureUrl(brandingSignatureFile) {
  if (!isValidSignaturePath(brandingSignatureFile)) return null;
  return resolvePublicFileUrl(brandingSignatureFile) || brandingSignatureFile;
}

async function resolveSignatureOptions({
  signatureType,
  issuerProfile,
  brandingSignatureFile,
}) {
  const templateSignatureUrl = resolveTemplateSignatureUrl(brandingSignatureFile);
  const userHasSignature =
    Boolean(issuerProfile?.signature_enabled) &&
    isValidSignaturePath(issuerProfile?.signature_file);

  if (signatureType === "user") {
    if (!userHasSignature) {
      const err = new Error("User signature is not available");
      err.status = 400;
      throw err;
    }
    return {
      signatureType: "user",
      templateSignatureUrl: null,
      userSignatureUrl: resolvePublicFileUrl(issuerProfile.signature_file),
    };
  }

  if (signatureType === "template") {
    if (!templateSignatureUrl) {
      const err = new Error(
        "Organization signature is not configured in system branding"
      );
      err.status = 400;
      throw err;
    }
    return {
      signatureType: "template",
      templateSignatureUrl,
      userSignatureUrl: null,
    };
  }

  return {
    signatureType: "none",
    templateSignatureUrl: null,
    userSignatureUrl: null,
  };
}

async function resolveScheduleContext({ patientId, scheduleId, appointmentId, staffId }) {
  let schedule = null;
  let appointment = null;

  if (appointmentId) {
    appointment = await medicalWorkflowService.canAccessAppointment(
      appointmentId,
      staffId
    );
    schedule = await PatientSchedule.findByPk(appointment.schedule_id);
    if (schedule && schedule.patient_id !== patientId) {
      const err = new Error("Patient does not match appointment");
      err.status = 400;
      throw err;
    }
  } else if (scheduleId) {
    schedule = await PatientSchedule.findByPk(scheduleId);
    if (!schedule) {
      const err = new Error("Schedule not found");
      err.status = 404;
      throw err;
    }
    if (schedule.patient_id !== patientId) {
      const err = new Error("Patient does not match schedule");
      err.status = 400;
      throw err;
    }
    appointment = await StaffAppointment.findOne({
      where: { schedule_id: scheduleId },
    });
    if (appointment) {
      await medicalWorkflowService.canAccessAppointment(
        appointment.appointment_id,
        staffId
      );
    }
  } else {
    const err = new Error("schedule_id or appointment_id is required");
    err.status = 400;
    throw err;
  }

  return { schedule, appointment };
}

async function loadPatient(patientId) {
  const patient = await User.findByPk(patientId, {
    attributes: ["user_id", "full_name"],
    include: patientInclude,
  });
  if (!patient) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }
  return patient.get({ plain: true });
}

async function loadDoctor(userId) {
  const doctor = await User.findByPk(userId, {
    attributes: ["user_id", "full_name", "email"],
    include: doctorInclude,
  });
  if (!doctor) {
    const err = new Error("Doctor not found");
    err.status = 404;
    throw err;
  }
  return doctor.get({ plain: true });
}

/**
 * Renders certificate HTML (client exports to PDF). Does not persist.
 */
async function generateMedicalCertificatePDF(
  patientId,
  scheduleId,
  templateId,
  includeOptions,
  options = {}
) {
  const staffId = options.staffId;
  const appointmentId = options.appointmentId || null;
  const signatureType = options.signatureType || "template";
  const doctorNotes = options.doctorNotes || "";
  const certificateNumber = options.certificateNumber || nextCertificateNumber();
  const verificationCode = options.verificationCode || nextVerificationCode();

  if (!CERTIFICATE_SIGNATURE_TYPES.includes(signatureType)) {
    const err = new Error("Invalid signature type");
    err.status = 400;
    throw err;
  }

  const normalizedInclude = normalizeIncludeOptions(includeOptions);
  const patient = await loadPatient(patientId);
  const { schedule, appointment } = await resolveScheduleContext({
    patientId,
    scheduleId,
    appointmentId,
    staffId,
  });

  const doctor = await loadDoctor(staffId);
  const issuerProfile = doctor.internalProfile;
  const brandingSignature = await getBrandingPrescriptionSignature();
  const signatureOpts = await resolveSignatureOptions({
    signatureType,
    issuerProfile,
    brandingSignatureFile: brandingSignature,
  });

  const sectionVars = await medicalCertificateWorkflowDataService.buildWorkflowSectionHtml({
    scheduleId: schedule?.schedule_id || scheduleId,
    appointmentId: appointment?.appointment_id || null,
    patientId,
    staffId,
    includeOptions: normalizedInclude,
  });

  const rendered_html = await medicalCertificatePrintService.renderMedicalCertificateDocument({
    templateId,
    patient,
    schedule: schedule?.get ? schedule.get({ plain: true }) : schedule,
    appointment: appointment?.get ? appointment.get({ plain: true }) : appointment,
    doctor,
    sectionVars,
    signatureType: signatureOpts.signatureType,
    templateSignatureUrl: signatureOpts.templateSignatureUrl,
    userSignatureUrl: signatureOpts.userSignatureUrl,
    doctorNotes,
    certificateNumber,
    verificationCode,
  });

  return {
    rendered_html,
    certificate_number: certificateNumber,
    verification_code: verificationCode,
    include_options: normalizedInclude,
    patient_id: patientId,
    schedule_id: schedule?.schedule_id || scheduleId || null,
    appointment_id: appointment?.appointment_id || null,
    template_id: templateId || null,
    signature_type: signatureOpts.signatureType,
  };
}

async function preview(payload, staffId) {
  return generateMedicalCertificatePDF(
    payload.patient_id,
    payload.schedule_id,
    payload.template_id,
    payload.include_options,
    {
      staffId,
      appointmentId: payload.appointment_id,
      signatureType: payload.signature_type || "template",
      doctorNotes: payload.doctor_notes,
    }
  );
}

async function issue(payload, staffId) {
  const previewResult = await generateMedicalCertificatePDF(
    payload.patient_id,
    payload.schedule_id,
    payload.template_id,
    payload.include_options,
    {
      staffId,
      appointmentId: payload.appointment_id,
      signatureType: payload.signature_type || "template",
      doctorNotes: payload.doctor_notes,
    }
  );

  const template = await medicalCertificatePrintService.resolveTemplate(
    payload.template_id
  );
  let templateIdForRecord = template.template_id || payload.template_id;
  if (!templateIdForRecord) {
    const defaultRow = await MedicalCertificateTemplate.findOne({
      where: { is_default: true, status: "active" },
    });
    templateIdForRecord = defaultRow?.template_id;
  }
  if (!templateIdForRecord) {
    const err = new Error("No medical certificate template configured");
    err.status = 400;
    throw err;
  }

  const row = await MedicalCertificate.create({
    certificate_number: previewResult.certificate_number,
    patient_id: payload.patient_id,
    schedule_id: previewResult.schedule_id,
    appointment_id: previewResult.appointment_id,
    template_id: templateIdForRecord,
    include_options: previewResult.include_options,
    doctor_notes: payload.doctor_notes || null,
    rendered_html: previewResult.rendered_html,
    signature_type: previewResult.signature_type,
    verification_code: previewResult.verification_code,
    issued_by: staffId,
  });

  return getById(row.certificate_id, staffId);
}

async function listBySchedule(scheduleId, staffId) {
  const schedule = await PatientSchedule.findByPk(scheduleId);
  if (!schedule) {
    const err = new Error("Schedule not found");
    err.status = 404;
    throw err;
  }

  const appointment = await StaffAppointment.findOne({
    where: { schedule_id: scheduleId },
  });
  if (appointment) {
    await medicalWorkflowService.canAccessAppointment(
      appointment.appointment_id,
      staffId
    );
  }

  const rows = await MedicalCertificate.findAll({
    where: { schedule_id: scheduleId },
    include: certificateInclude,
    order: [["created_at", "DESC"]],
  });

  return rows.map(format);
}

async function getById(certificateId, staffId) {
  const row = await MedicalCertificate.findByPk(certificateId, {
    include: certificateInclude,
  });
  if (!row) {
    const err = new Error("Medical certificate not found");
    err.status = 404;
    throw err;
  }

  if (row.appointment_id) {
    await medicalWorkflowService.canAccessAppointment(row.appointment_id, staffId);
  } else if (row.schedule_id) {
    const appointment = await StaffAppointment.findOne({
      where: { schedule_id: row.schedule_id },
    });
    if (appointment) {
      await medicalWorkflowService.canAccessAppointment(
        appointment.appointment_id,
        staffId
      );
    }
  }

  return format(row);
}

module.exports = {
  generateMedicalCertificatePDF,
  preview,
  issue,
  listBySchedule,
  getById,
  normalizeIncludeOptions,
};
