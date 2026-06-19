"use strict";

const { SystemSetting } = require("../models");

const DEFAULT_SYSTEM_SETTINGS_ID = "a0000000-0000-4000-8000-000000000001";

const DEFAULT_SYSTEM_SETTINGS = {
  system_setting_id: DEFAULT_SYSTEM_SETTINGS_ID,
  expose_required_permissions: false,
};

let cachedSettings = { ...DEFAULT_SYSTEM_SETTINGS };

function applyCache(record) {
  cachedSettings = {
    system_setting_id: record.system_setting_id,
    expose_required_permissions: Boolean(record.expose_required_permissions),
  };
  return cachedSettings;
}

function getCachedSystemSettings() {
  return cachedSettings;
}

function shouldExposeRequiredPermissions() {
  return Boolean(cachedSettings.expose_required_permissions);
}

async function warmSystemSettingsCache() {
  let record = await SystemSetting.findByPk(DEFAULT_SYSTEM_SETTINGS_ID);
  if (!record) {
    record = await SystemSetting.create(DEFAULT_SYSTEM_SETTINGS);
  }
  return applyCache(record);
}

async function getSystemSettings() {
  if (!cachedSettings.system_setting_id) {
    return warmSystemSettingsCache();
  }
  return cachedSettings;
}

async function updateSystemSettings(payload) {
  let record = await SystemSetting.findByPk(DEFAULT_SYSTEM_SETTINGS_ID);
  if (!record) {
    record = await SystemSetting.create({
      ...DEFAULT_SYSTEM_SETTINGS,
      ...payload,
    });
  } else {
    await record.update(payload);
  }
  return applyCache(record);
}

module.exports = {
  DEFAULT_SYSTEM_SETTINGS,
  getCachedSystemSettings,
  shouldExposeRequiredPermissions,
  warmSystemSettingsCache,
  getSystemSettings,
  updateSystemSettings,
};
