"use strict";

const { SystemBranding } = require("../../models");
const { v4: uuidv4 } = require("uuid");
const {
  mergeBrandingTheme,
  themeFromRecord,
  legacyFieldsFromTheme,
} = require("../../config/brandingThemeDefaults");
const { PLATFORM_LOGO_URL } = require("../../config/platformBranding");
const { createTtlCache } = require("../../utils/ttlCache");
const { sendError } = require("../../utils/httpError");

const activeBrandingCache = createTtlCache({ ttlMs: 60_000 });

const invalidateActiveBrandingCache = () => activeBrandingCache.clear();

const formatBranding = (record) => {
  const plain = record?.toJSON ? record.toJSON() : record;
  if (!plain) return null;

  const theme_json = themeFromRecord(plain);
  const legacy = legacyFieldsFromTheme(theme_json);

  return {
    ...plain,
    ...legacy,
    theme_json,
  };
};

const normalizePayload = (body) => {
  const {
    system_name,
    system_name_am,
    tagline,
    logo_url,
    logo_login_url,
    theme_json,
    primary_hsl,
    accent_hsl,
    sidebar_hover_hsl,
    accent_hover_hsl,
    golden_dark_hsl,
    golden_metallic_hsl,
    golden_dark_hover_hsl,
    is_active,
    organization_address,
    organization_city,
    organization_region,
    organization_country,
    organization_branch,
    contact_phone,
    contact_email,
    license_info,
    prescription_config,
    prescription_signature_file,
  } = body;

  const resolvedAccent = accent_hsl ?? golden_dark_hsl;
  const resolvedSidebarHover = sidebar_hover_hsl ?? golden_metallic_hsl;
  const resolvedAccentHover = accent_hover_hsl ?? golden_dark_hover_hsl;

  let theme = theme_json;
  if (!theme) {
    theme = mergeBrandingTheme({
      ...(primary_hsl ? { primary: primary_hsl } : {}),
      ...(resolvedAccent ? { "section-accent": resolvedAccent } : {}),
      ...(resolvedSidebarHover ? { "sidebar-hover": resolvedSidebarHover } : {}),
      ...(resolvedAccentHover ? { "section-accent-hover": resolvedAccentHover } : {}),
    });
  } else {
    theme = mergeBrandingTheme(theme);
  }

  const legacy = legacyFieldsFromTheme(theme);
  const resolvedLogo = logo_url?.trim() || PLATFORM_LOGO_URL;
  const resolvedLoginLogo =
    logo_login_url?.trim() || resolvedLogo || PLATFORM_LOGO_URL;

  return {
    system_name,
    system_name_am: system_name_am || null,
    tagline: tagline || null,
    logo_url: resolvedLogo,
    logo_login_url: resolvedLoginLogo,
    theme_json: theme,
    ...legacy,
    is_active,
    organization_address: organization_address || null,
    organization_city: organization_city || null,
    organization_region: organization_region || null,
    organization_country: organization_country || null,
    organization_branch: organization_branch || null,
    contact_phone: contact_phone || null,
    contact_email: contact_email || null,
    license_info: license_info || null,
    prescription_config: prescription_config || null,
    prescription_signature_file: prescription_signature_file || null,
  };
};

const deactivateAllBranding = async (transaction) => {
  await SystemBranding.update(
    { is_active: false, updated_at: new Date() },
    { where: { is_active: true }, transaction }
  );
};

const createBranding = async (req, res) => {
  const t = await SystemBranding.sequelize.transaction();
  try {
    const payload = normalizePayload(req.body);
    const is_active = payload.is_active ?? false;

    if (is_active) {
      await deactivateAllBranding(t);
    }

    const branding = await SystemBranding.create(
      {
        branding_id: uuidv4(),
        ...payload,
        is_active,
      },
      { transaction: t }
    );

    await t.commit();

    invalidateActiveBrandingCache();

    return res.status(201).json({
      success: true,
      message: "Branding created successfully",
      data: formatBranding(branding),
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    return sendError(res, error, req);
  }
};

const getBrandingList = async (req, res) => {
  try {
    const { is_active } = req.query;
    const where = {};

    if (is_active !== undefined) {
      where.is_active = is_active === "true";
    }

    const records = await SystemBranding.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map(formatBranding),
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const getActiveBranding = async (_req, res) => {
  try {
    const cached = activeBrandingCache.get();
    if (cached !== null) {
      return res.status(200).json({ success: true, data: cached });
    }

    const active = await SystemBranding.findOne({
      where: { is_active: true },
      order: [["updated_at", "DESC"]],
    });

    const data = active ? formatBranding(active) : null;
    activeBrandingCache.set(data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const getBrandingById = async (req, res) => {
  try {
    const { id } = req.params;
    const branding = await SystemBranding.findByPk(id);

    if (!branding) {
      return res.status(404).json({
        success: false,
        message: "Branding not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatBranding(branding),
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const updateBranding = async (req, res) => {
  const t = await SystemBranding.sequelize.transaction();
  try {
    const { id } = req.params;
    const branding = await SystemBranding.findByPk(id, { transaction: t });

    if (!branding) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Branding not found",
      });
    }

    const normalized = normalizePayload({ ...branding.toJSON(), ...req.body });
    const updateData = {
      ...normalized,
      updated_at: new Date(),
    };

    if (req.body.is_active !== undefined) {
      updateData.is_active = req.body.is_active;
    }

    if (updateData.is_active === true) {
      await deactivateAllBranding(t);
    }

    await branding.update(updateData, { transaction: t });
    await t.commit();

    invalidateActiveBrandingCache();

    return res.status(200).json({
      success: true,
      message: "Branding updated successfully",
      data: formatBranding(await SystemBranding.findByPk(id)),
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    return sendError(res, error, req);
  }
};

const deleteBranding = async (req, res) => {
  try {
    const { id } = req.params;
    const branding = await SystemBranding.findByPk(id);

    if (!branding) {
      return res.status(404).json({
        success: false,
        message: "Branding not found",
      });
    }

    if (branding.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the active branding configuration",
      });
    }

    await branding.destroy();

    invalidateActiveBrandingCache();

    return res.status(200).json({
      success: true,
      message: "Branding deleted successfully",
    });
  } catch (error) {
    return sendError(res, error, req);
  }
};

const activateBranding = async (req, res) => {
  const t = await SystemBranding.sequelize.transaction();
  try {
    const { id } = req.params;
    const branding = await SystemBranding.findByPk(id, { transaction: t });

    if (!branding) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Branding not found",
      });
    }

    await deactivateAllBranding(t);
    await branding.update({ is_active: true, updated_at: new Date() }, { transaction: t });
    await t.commit();

    invalidateActiveBrandingCache();

    return res.status(200).json({
      success: true,
      message: "Branding activated successfully",
      data: formatBranding(await SystemBranding.findByPk(id)),
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    return sendError(res, error, req);
  }
};

module.exports = {
  createBranding,
  getBrandingList,
  getActiveBranding,
  getBrandingById,
  updateBranding,
  deleteBranding,
  activateBranding,
};
