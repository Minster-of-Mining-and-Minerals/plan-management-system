"use strict";

const { Op } = require("sequelize");
const { MedicalCertificateTemplate } = require("../models");
const {
  DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
  DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
  DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
} = require("../config/defaultMedicalCertificateDocumentTemplate");
const { MEDICAL_CERTIFICATE_TEMPLATE_STATUSES } = require("../config/medicalCertificateConstants");

const format = (row) => row.get({ plain: true });

async function list({ status, search } = {}) {
  const where = {};
  if (status) where.status = status;

  const rows = await MedicalCertificateTemplate.findAll({
    where,
    order: [
      ["is_default", "DESC"],
      ["created_at", "DESC"],
    ],
  });

  let data = rows.map(format);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );
  }
  return data;
}

async function getById(templateId) {
  const row = await MedicalCertificateTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Certificate template not found");
    err.status = 404;
    throw err;
  }
  return format(row);
}

async function unsetOtherDefaults(excludeId, transaction) {
  const where = { is_default: true };
  if (excludeId) where.template_id = { [Op.ne]: excludeId };
  await MedicalCertificateTemplate.update(
    { is_default: false },
    { where, transaction }
  );
}

async function create(payload, actorId) {
  const dup = await MedicalCertificateTemplate.findOne({
    where: { code: payload.code },
  });
  if (dup) {
    const err = new Error("Template code already exists");
    err.status = 409;
    throw err;
  }

  const { sequelize } = MedicalCertificateTemplate;
  return sequelize.transaction(async (transaction) => {
    if (payload.is_default) {
      await unsetOtherDefaults(null, transaction);
    }

    const row = await MedicalCertificateTemplate.create(
      {
        name: payload.name,
        code: payload.code,
        header_html: payload.header_html || DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
        footer_html: payload.footer_html || DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
        html_content: payload.html_content || DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
        stamp_image_file: payload.stamp_image_file || null,
        has_template_stamp: Boolean(payload.has_template_stamp),
        is_default: Boolean(payload.is_default),
        status: payload.status || "active",
        created_by: actorId,
        updated_by: actorId,
      },
      { transaction }
    );

    return row.template_id;
  }).then((id) => getById(id));
}

async function update(templateId, payload, actorId) {
  const row = await MedicalCertificateTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Certificate template not found");
    err.status = 404;
    throw err;
  }

  if (payload.code && payload.code !== row.code) {
    const dup = await MedicalCertificateTemplate.findOne({
      where: { code: payload.code },
    });
    if (dup) {
      const err = new Error("Template code already exists");
      err.status = 409;
      throw err;
    }
  }

  if (payload.status && !MEDICAL_CERTIFICATE_TEMPLATE_STATUSES.includes(payload.status)) {
    const err = new Error("Invalid template status");
    err.status = 400;
    throw err;
  }

  const { sequelize } = MedicalCertificateTemplate;
  return sequelize.transaction(async (transaction) => {
    if (payload.is_default) {
      await unsetOtherDefaults(templateId, transaction);
    }

    await row.update(
      {
        name: payload.name ?? row.name,
        code: payload.code ?? row.code,
        header_html: payload.header_html ?? row.header_html,
        footer_html: payload.footer_html ?? row.footer_html,
        html_content: payload.html_content ?? row.html_content,
        stamp_image_file:
          payload.stamp_image_file !== undefined
            ? payload.stamp_image_file
            : row.stamp_image_file,
        has_template_stamp:
          payload.has_template_stamp !== undefined
            ? Boolean(payload.has_template_stamp)
            : row.has_template_stamp,
        is_default:
          payload.is_default !== undefined
            ? Boolean(payload.is_default)
            : row.is_default,
        status: payload.status ?? row.status,
        updated_by: actorId,
      },
      { transaction }
    );

    return getById(templateId);
  });
}

async function remove(templateId) {
  const row = await MedicalCertificateTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Certificate template not found");
    err.status = 404;
    throw err;
  }
  if (row.is_default) {
    const err = new Error("Cannot delete the default certificate template");
    err.status = 400;
    throw err;
  }
  await row.update({ status: "archived" });
  return format(row);
}

function getPlaceholderCatalog() {
  return [
    { key: "hospital_name", description: "Hospital / organization name" },
    { key: "hospital_logo_block", description: "Hospital logo image" },
    { key: "hospital_location", description: "Hospital address" },
    { key: "contact_phone", description: "Contact phone" },
    { key: "contact_email", description: "Contact email" },
    { key: "license_info_block", description: "License line from branding" },
    { key: "certificate_number", description: "Unique certificate ID" },
    { key: "verification_hint", description: "Verification / QR hint text" },
    { key: "patient_name", description: "Patient full name" },
    { key: "patient_id", description: "Patient code or ID" },
    { key: "patient_age", description: "Patient age" },
    { key: "patient_gender", description: "Patient gender" },
    { key: "visit_date", description: "Visit / schedule date" },
    { key: "visit_department", description: "Department" },
    { key: "visit_service", description: "Service / appointment type" },
    { key: "doctor_name", description: "Physician name" },
    { key: "doctor_specialization", description: "Physician role / title" },
    { key: "doctor_department", description: "Physician department" },
    { key: "doctor_license_block", description: "Physician license (if stored)" },
    { key: "section_diagnosis", description: "Diagnosis section (workflow)" },
    { key: "section_treatment", description: "Treatment section (workflow)" },
    { key: "section_prescription", description: "Prescription reference section" },
    { key: "section_lab_results", description: "Lab results section" },
    { key: "section_procedure_notes", description: "Procedure notes section" },
    { key: "section_referral", description: "Referral / routing section" },
    { key: "doctor_remarks", description: "Optional doctor remarks" },
    { key: "signature", description: "Physician signature image" },
    { key: "hospital_stamp", description: "Hospital stamp image" },
    { key: "signature_date", description: "Signed date" },
    { key: "certificate_header", description: "Rendered header block" },
    { key: "certificate_footer", description: "Rendered footer block" },
  ];
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getPlaceholderCatalog,
};
