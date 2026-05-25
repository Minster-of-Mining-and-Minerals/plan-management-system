"use strict";

const { PatientProfile } = require("../models");
const { Op } = require("sequelize");

function formatDatePart(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function generatePatientCode(transaction) {
  const prefix = `NC-${formatDatePart()}-`;
  const latest = await PatientProfile.findOne({
    where: { patient_code: { [Op.like]: `${prefix}%` } },
    order: [["patient_code", "DESC"]],
    transaction,
  });

  let seq = 1;
  if (latest?.patient_code) {
    const parts = latest.patient_code.split("-");
    const last = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(last)) seq = last + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

module.exports = { generatePatientCode };
