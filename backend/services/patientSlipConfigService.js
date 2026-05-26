"use strict";

const { SystemBranding } = require("../models");
const {
  DEFAULT_PATIENT_SLIP_CONFIG,
  mergeSlipConfig,
} = require("../config/defaultPatientSlipConfig");

async function getActiveBrandingRecord() {
  return SystemBranding.findOne({
    where: { is_active: true },
    order: [["updated_at", "DESC"]],
  });
}

async function getSlipConfig() {
  const branding = await getActiveBrandingRecord();
  const slip_config = mergeSlipConfig(branding?.slip_config);
  return {
    branding_id: branding?.branding_id ?? null,
    slip_config,
    defaults: DEFAULT_PATIENT_SLIP_CONFIG,
  };
}

async function updateSlipConfig(payload, actorUserId) {
  let branding = await getActiveBrandingRecord();

  if (!branding) {
    branding = await SystemBranding.findOne({ order: [["created_at", "ASC"]] });
  }

  if (!branding) {
    const err = new Error("No branding record found. Seed default branding first.");
    err.status = 404;
    throw err;
  }

  const slip_config = mergeSlipConfig(payload);
  await branding.update({
    slip_config,
    updated_by: actorUserId || null,
    updated_at: new Date(),
  });

  return {
    branding_id: branding.branding_id,
    slip_config,
  };
}

module.exports = {
  getSlipConfig,
  updateSlipConfig,
  mergeSlipConfig,
};
