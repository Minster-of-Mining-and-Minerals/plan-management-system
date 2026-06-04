"use strict";

const { BrandingSetting, BrandingAuditLog, User, sequelize } = require("../../models");
const {
  DEFAULT_BRANDING_ID,
  DEFAULT_BRANDING,
  pickBrandingPayload,
  brandingToCssVariables,
  validateReadableTheme,
} = require("../../services/brandingService");

async function getOrCreateGlobalBranding(transaction) {
  let record = await BrandingSetting.findByPk(DEFAULT_BRANDING_ID, { transaction });
  if (!record) {
    const now = new Date();
    record = await BrandingSetting.create(
      {
        ...DEFAULT_BRANDING,
        created_at: now,
        updated_at: now,
      },
      { transaction }
    );
  }
  return record;
}

const getPublicBranding = async (req, res) => {
  try {
    const record = await getOrCreateGlobalBranding();
    const branding = pickBrandingPayload(record);
    return res.json({
      success: true,
      data: {
        ...branding,
        css_variables: brandingToCssVariables(branding),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getBrandingSettings = async (req, res) => {
  try {
    const record = await getOrCreateGlobalBranding();
    return res.json({ success: true, data: pickBrandingPayload(record) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateBrandingSettings = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const record = await getOrCreateGlobalBranding(t);
    const previous = pickBrandingPayload(record);
    const merged = { ...previous, ...req.body, branding_setting_id: DEFAULT_BRANDING_ID };

    const validationError = validateReadableTheme(merged);
    if (validationError) {
      await t.rollback();
      return res.status(400).json({ success: false, message: validationError });
    }

    await record.update(
      {
        system_name_full: merged.system_name_full,
        system_name_short: merged.system_name_short,
        system_tagline: merged.system_tagline ?? null,
        logo_primary_path: merged.logo_primary_path ?? null,
        logo_secondary_path: merged.logo_secondary_path ?? null,
        favicon_path: merged.favicon_path ?? null,
        primary_color: merged.primary_color,
        secondary_color: merged.secondary_color,
        accent_color: merged.accent_color,
        success_color: merged.success_color,
        warning_color: merged.warning_color,
        error_color: merged.error_color,
        info_color: merged.info_color,
        background_color: merged.background_color,
        surface_color: merged.surface_color,
        sidebar_color: merged.sidebar_color,
        header_color: merged.header_color,
        text_primary_color: merged.text_primary_color,
        text_secondary_color: merged.text_secondary_color,
        border_color: merged.border_color,
      },
      { transaction: t }
    );

    const updated = pickBrandingPayload(record);

    await BrandingAuditLog.create(
      {
        branding_setting_id: DEFAULT_BRANDING_ID,
        changed_by: req.user.user_id,
        previous_values: previous,
        new_values: updated,
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      success: true,
      data: {
        ...updated,
        css_variables: brandingToCssVariables(updated),
      },
      message: "Branding settings updated successfully",
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const restoreDefaultBranding = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const record = await getOrCreateGlobalBranding(t);
    const previous = pickBrandingPayload(record);

    await record.update(
      {
        system_name_full: DEFAULT_BRANDING.system_name_full,
        system_name_short: DEFAULT_BRANDING.system_name_short,
        system_tagline: DEFAULT_BRANDING.system_tagline,
        logo_primary_path: DEFAULT_BRANDING.logo_primary_path,
        logo_secondary_path: DEFAULT_BRANDING.logo_secondary_path,
        favicon_path: DEFAULT_BRANDING.favicon_path,
        primary_color: DEFAULT_BRANDING.primary_color,
        secondary_color: DEFAULT_BRANDING.secondary_color,
        accent_color: DEFAULT_BRANDING.accent_color,
        success_color: DEFAULT_BRANDING.success_color,
        warning_color: DEFAULT_BRANDING.warning_color,
        error_color: DEFAULT_BRANDING.error_color,
        info_color: DEFAULT_BRANDING.info_color,
        background_color: DEFAULT_BRANDING.background_color,
        surface_color: DEFAULT_BRANDING.surface_color,
        sidebar_color: DEFAULT_BRANDING.sidebar_color,
        header_color: DEFAULT_BRANDING.header_color,
        text_primary_color: DEFAULT_BRANDING.text_primary_color,
        text_secondary_color: DEFAULT_BRANDING.text_secondary_color,
        border_color: DEFAULT_BRANDING.border_color,
      },
      { transaction: t }
    );

    const updated = pickBrandingPayload(record);

    await BrandingAuditLog.create(
      {
        branding_setting_id: DEFAULT_BRANDING_ID,
        changed_by: req.user.user_id,
        previous_values: previous,
        new_values: updated,
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      success: true,
      data: {
        ...updated,
        css_variables: brandingToCssVariables(updated),
      },
      message: "Branding restored to system defaults",
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getBrandingAuditLogs = async (req, res) => {
  try {
    const logs = await BrandingAuditLog.findAll({
      where: { branding_setting_id: DEFAULT_BRANDING_ID },
      include: [
        {
          model: User,
          as: "changedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicBranding,
  getBrandingSettings,
  updateBrandingSettings,
  restoreDefaultBranding,
  getBrandingAuditLogs,
};
