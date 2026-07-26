"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class OrganizationTenantService {
  async createTenant(data) {
    if (!data.name) {
      throw new Error("Organization tenant name is required");
    }

    const tenant = await db.OrganizationTenant.create({
      tenant_id: data.tenant_id || uuidv4(),
      name: data.name,
      type: data.type || "HOSPITAL",
      branding_config_json: data.branding_config_json || {},
      timezone: data.timezone || "UTC",
      currency: data.currency || "USD",
      country: data.country || "US",
      status: data.status || "ACTIVE",
    });

    return tenant.get({ plain: true });
  }

  async updateTenant(tenantId, updateData) {
    const tenant = await db.OrganizationTenant.findByPk(tenantId);
    if (!tenant) {
      throw new Error(`Organization tenant not found: ${tenantId}`);
    }

    await tenant.update(updateData);
    return tenant.get({ plain: true });
  }

  async getTenant(tenantId) {
    const tenant = await db.OrganizationTenant.findByPk(tenantId);
    if (!tenant) return null;
    return tenant.get({ plain: true });
  }

  async listTenants(where = {}) {
    const tenants = await db.OrganizationTenant.findAll({ where });
    return tenants.map((t) => t.get({ plain: true }));
  }

  async getTenantHierarchyTree(tenantId) {
    const tenant = await db.OrganizationTenant.findByPk(tenantId, {
      include: [
        {
          model: db.Facility,
          as: "facilities",
          include: [
            {
              model: db.Department,
              as: "departments",
              include: [
                {
                  model: db.Unit,
                  as: "units",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!tenant) {
      return null;
    }

    return tenant.get({ plain: true });
  }
}

module.exports = new OrganizationTenantService();
