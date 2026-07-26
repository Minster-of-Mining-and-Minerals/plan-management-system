"use strict";

const db = require("../../models");

const DEFAULT_BRANDING = {
  application_name: "NovaCure EHR",
  logo_url: "/logo.png",
  favicon_url: "/favicon.ico",
  colors: {
    primary: "#0284c7",
    primary_hover: "#0369a1",
    secondary: "#475569",
    accent: "#0d9488",
    background: "#f8fafc",
  },
};

class TenantBrandingService {
  async getBranding(tenantId) {
    if (!tenantId || tenantId === "DEFAULT_HOSPITAL") {
      return { tenant_id: "DEFAULT_HOSPITAL", ...DEFAULT_BRANDING };
    }

    const tenant = await db.OrganizationTenant.findByPk(tenantId);
    if (!tenant || !tenant.branding_config_json) {
      return { tenant_id: tenantId, name: tenant ? tenant.name : "NovaCure", ...DEFAULT_BRANDING };
    }

    const config = tenant.branding_config_json || {};

    return {
      tenant_id: tenant.tenant_id,
      name: tenant.name,
      application_name: config.application_name || tenant.name || DEFAULT_BRANDING.application_name,
      logo_url: config.logo_url || DEFAULT_BRANDING.logo_url,
      favicon_url: config.favicon_url || DEFAULT_BRANDING.favicon_url,
      colors: {
        ...DEFAULT_BRANDING.colors,
        ...(config.colors || {}),
      },
    };
  }

  async updateBranding(tenantId, brandingData) {
    const tenant = await db.OrganizationTenant.findByPk(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const currentConfig = tenant.branding_config_json || {};
    const updatedConfig = {
      ...currentConfig,
      ...brandingData,
      colors: {
        ...(currentConfig.colors || {}),
        ...(brandingData.colors || {}),
      },
    };

    await tenant.update({ branding_config_json: updatedConfig });
    return this.getBranding(tenantId);
  }
}

module.exports = new TenantBrandingService();
