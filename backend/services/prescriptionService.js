"use strict";

const {
  Prescription,
  PrescriptionItem,
  PrescriptionTemplate,
  PrescriptionTemplateItem,
  PrescriptionCategory,
  User,
  InternalUserProfile,
  PatientProfile,
  Department,
  UserTitle,
  StaffAppointment,
  SystemBranding,
} = require("../models");
const prescriptionPrintService = require("./prescriptionPrintService");
const { SIGNATURE_TYPES } = require("../config/prescriptionConstants");
const {
  isValidSignaturePath,
  resolvePublicFileUrl,
} = require("../utils/resolvePublicFileUrl");

const prescriptionInclude = [
  { model: PrescriptionCategory, as: "category" },
  { model: PrescriptionTemplate, as: "template" },
  {
    model: PrescriptionItem,
    as: "items",
    separate: true,
    order: [["sort_order", "ASC"]],
  },
  {
    model: User,
    as: "prescriber",
    attributes: ["user_id", "full_name", "email"],
    include: [
      {
        model: InternalUserProfile,
        as: "internalProfile",
        include: [
          { model: Department, as: "departmentRef", attributes: ["name"] },
          { model: UserTitle, as: "titleRef", attributes: ["name"] },
        ],
      },
    ],
  },
  {
    model: User,
    as: "patient",
    attributes: ["user_id", "full_name"],
    include: [
      {
        model: PatientProfile,
        as: "patientProfile",
        attributes: ["patient_code"],
      },
    ],
  },
];

async function getBrandingPrescriptionSignature() {
  const branding = await SystemBranding.findOne({
    where: { is_active: true },
    attributes: ["prescription_signature_file"],
    order: [["updated_at", "DESC"]],
  });
  return branding?.prescription_signature_file || null;
}

function resolveTemplateSignatureUrl(template, brandingSignatureFile) {
  if (!template?.has_template_signature) return null;
  const branding = isValidSignaturePath(brandingSignatureFile)
    ? brandingSignatureFile
    : null;
  const templateFile = isValidSignaturePath(template?.template_signature_file)
    ? template.template_signature_file
    : null;
  return branding || templateFile || null;
}

function normalizeSignatureUrl(filePath) {
  if (!isValidSignaturePath(filePath)) return null;
  return resolvePublicFileUrl(filePath) || filePath;
}

async function resolveSignatureOptions({
  signatureType,
  template,
  prescriberProfile,
  brandingSignatureFile,
}) {
  const templateSignatureUrl = resolveTemplateSignatureUrl(
    template,
    brandingSignatureFile
  );
  const userHasSignature =
    Boolean(prescriberProfile?.signature_enabled) &&
    isValidSignaturePath(prescriberProfile?.signature_file);

  if (signatureType === "user") {
    if (!userHasSignature) {
      const err = new Error("User signature is not available");
      err.status = 400;
      throw err;
    }
    return {
      signatureType: "user",
      templateSignatureUrl: null,
      userSignatureUrl: normalizeSignatureUrl(prescriberProfile.signature_file),
    };
  }

  if (signatureType === "template" && template?.has_template_signature) {
    if (!templateSignatureUrl) {
      const err = new Error(
        "Organization prescription signature is not configured in system branding"
      );
      err.status = 400;
      throw err;
    }
    return {
      signatureType: "template",
      templateSignatureUrl: normalizeSignatureUrl(templateSignatureUrl),
      userSignatureUrl: null,
    };
  }

  if (signatureType === "none") {
    return { signatureType: "none", templateSignatureUrl: null, userSignatureUrl: null };
  }

  if (userHasSignature && template?.allow_user_signature_override !== false) {
    return {
      signatureType: "user",
      templateSignatureUrl: null,
      userSignatureUrl: normalizeSignatureUrl(prescriberProfile.signature_file),
    };
  }

  if (template?.has_template_signature && templateSignatureUrl) {
    return {
      signatureType: "template",
      templateSignatureUrl: normalizeSignatureUrl(templateSignatureUrl),
      userSignatureUrl: null,
    };
  }

  return { signatureType: "none", templateSignatureUrl: null, userSignatureUrl: null };
}

async function createPrescription(payload, actorId) {
  if (!SIGNATURE_TYPES.includes(payload.signature_type)) {
    const err = new Error("Invalid signature type");
    err.status = 400;
    throw err;
  }

  const template = payload.template_id
    ? await PrescriptionTemplate.findByPk(payload.template_id, {
        include: [{ model: PrescriptionTemplateItem, as: "items" }],
      })
    : null;

  const prescriber = await User.findByPk(actorId, {
    include: [{ model: InternalUserProfile, as: "internalProfile" }],
  });
  const patient = await User.findByPk(payload.patient_id, {
    include: [{ model: PatientProfile, as: "patientProfile" }],
  });
  if (!patient) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }

  const appointment = payload.appointment_id
    ? await StaffAppointment.findByPk(payload.appointment_id)
    : null;

  const items =
    payload.items?.length > 0
      ? payload.items
      : template?.items?.map((i) => i.get({ plain: true })) || [];

  if (!items.length) {
    const err = new Error("At least one prescription item is required");
    err.status = 400;
    throw err;
  }

  const brandingSignatureFile = await getBrandingPrescriptionSignature();

  const signature = await resolveSignatureOptions({
    signatureType: payload.signature_type,
    template: template?.get({ plain: true }),
    prescriberProfile: prescriber?.internalProfile?.get({ plain: true }),
    brandingSignatureFile,
  });

  const renderedHtml = await prescriptionPrintService.renderPrescriptionDocument({
    documentTemplateId: payload.document_template_id,
    categoryId: payload.category_id || template?.category_id,
    patient: patient.get({ plain: true }),
    appointment: appointment?.get({ plain: true }),
    prescriber: prescriber?.get({ plain: true }),
    items,
    signatureType: signature.signatureType,
    templateSignatureUrl: signature.templateSignatureUrl,
    userSignatureUrl: signature.userSignatureUrl,
    notes: payload.notes,
  });

  const prescription = await Prescription.create({
    appointment_id: payload.appointment_id,
    patient_id: payload.patient_id,
    prescriber_id: actorId,
    category_id: payload.category_id || template?.category_id,
    template_id: payload.template_id,
    document_template_id: payload.document_template_id,
    header_title: payload.header_title,
    signature_type: signature.signatureType,
    rendered_html: renderedHtml,
    notes: payload.notes,
    status: payload.status || "issued",
    issued_at: new Date(),
    workflow_log_id: payload.workflow_log_id,
    created_by: actorId,
    updated_by: actorId,
  });

  await PrescriptionItem.bulkCreate(
    items.map((item, index) => ({
      prescription_id: prescription.prescription_id,
      item_name: item.item_name,
      strength: item.strength,
      route: item.route,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity: item.quantity,
      notes: item.notes,
      sort_order: item.sort_order ?? index,
    }))
  );

  return getById(prescription.prescription_id);
}

async function getById(prescriptionId) {
  const row = await Prescription.findByPk(prescriptionId, {
    include: prescriptionInclude,
  });
  if (!row) {
    const err = new Error("Prescription not found");
    err.status = 404;
    throw err;
  }
  return row.get({ plain: true });
}

async function list({ patient_id, appointment_id, prescriber_id } = {}) {
  const where = {};
  if (patient_id) where.patient_id = patient_id;
  if (appointment_id) where.appointment_id = appointment_id;
  if (prescriber_id) where.prescriber_id = prescriber_id;

  const rows = await Prescription.findAll({
    where,
    include: prescriptionInclude,
    order: [["created_at", "DESC"]],
  });
  return rows.map((r) => r.get({ plain: true }));
}

async function preview(payload, actorId) {
  const template = payload.template_id
    ? await PrescriptionTemplate.findByPk(payload.template_id, {
        include: [{ model: PrescriptionTemplateItem, as: "items" }],
      })
    : null;

  const prescriber = await User.findByPk(actorId, {
    include: [{ model: InternalUserProfile, as: "internalProfile" }],
  });

  const patient = payload.patient_id
    ? await User.findByPk(payload.patient_id, {
        include: [{ model: PatientProfile, as: "patientProfile" }],
      })
    : { full_name: "Sample Patient", patientProfile: { patient_code: "DEMO-001" } };

  const appointment = payload.appointment_id
    ? await StaffAppointment.findByPk(payload.appointment_id)
    : null;

  const items =
    payload.items?.length > 0
      ? payload.items
      : template?.items?.map((i) => i.get({ plain: true })) || [];

  const brandingSignatureFile = await getBrandingPrescriptionSignature();

  const signature = await resolveSignatureOptions({
    signatureType: payload.signature_type || "template",
    template: template?.get({ plain: true }),
    prescriberProfile: prescriber?.internalProfile?.get({ plain: true }),
    brandingSignatureFile,
  });

  const html = await prescriptionPrintService.renderPrescriptionDocument({
    documentTemplateId: payload.document_template_id,
    categoryId: payload.category_id || template?.category_id,
    patient: patient?.get ? patient.get({ plain: true }) : patient,
    appointment: appointment?.get({ plain: true }),
    prescriber: prescriber?.get({ plain: true }),
    items,
    signatureType: signature.signatureType,
    templateSignatureUrl: signature.templateSignatureUrl,
    userSignatureUrl: signature.userSignatureUrl,
    notes: payload.notes,
  });

  return {
    html,
    signature_type: signature.signatureType,
    can_use_user_signature:
      Boolean(prescriber?.internalProfile?.signature_enabled) &&
      isValidSignaturePath(prescriber?.internalProfile?.signature_file),
    can_use_template_signature: Boolean(
      template?.has_template_signature &&
        resolveTemplateSignatureUrl(
          template?.get({ plain: true }),
          brandingSignatureFile
        )
    ),
  };
}

async function getSignatureCapabilities(userId, templateId) {
  const prescriber = await User.findByPk(userId, {
    include: [{ model: InternalUserProfile, as: "internalProfile" }],
  });
  const template = templateId
    ? await PrescriptionTemplate.findByPk(templateId)
    : null;
  const brandingSignatureFile = await getBrandingPrescriptionSignature();
  const templatePlain = template?.get({ plain: true });
  const templateSignatureUrl = resolveTemplateSignatureUrl(
    templatePlain,
    brandingSignatureFile
  );

  const profile = prescriber?.internalProfile?.get({ plain: true });
  const userSignatureAvailable =
    Boolean(profile?.signature_enabled) &&
    isValidSignaturePath(profile?.signature_file);

  return {
    user_signature_available: userSignatureAvailable,
    template_signature_available: Boolean(
      templatePlain?.has_template_signature && templateSignatureUrl
    ),
    allow_user_signature_override: template?.allow_user_signature_override !== false,
    default_signature_type:
      templatePlain?.has_template_signature && templateSignatureUrl
        ? "template"
        : userSignatureAvailable
          ? "user"
          : "none",
  };
}

module.exports = {
  createPrescription,
  getById,
  list,
  preview,
  getSignatureCapabilities,
};
