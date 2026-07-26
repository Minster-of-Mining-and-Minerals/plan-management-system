"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class FacilityHierarchyService {
  async createFacility(data) {
    if (!data.name || !data.code || !data.tenant_id) {
      throw new Error("Facility name, code, and tenant_id are required");
    }

    const facility = await db.Facility.create({
      facility_id: data.facility_id || uuidv4(),
      tenant_id: data.tenant_id,
      name: data.name,
      code: data.code,
      type: data.type || "HOSPITAL",
      address: data.address || {},
      status: data.status || "ACTIVE",
    });

    return facility.get({ plain: true });
  }

  async updateFacility(facilityId, data) {
    const facility = await db.Facility.findByPk(facilityId);
    if (!facility) {
      throw new Error(`Facility not found: ${facilityId}`);
    }

    await facility.update(data);
    return facility.get({ plain: true });
  }

  async getFacility(facilityId) {
    const facility = await db.Facility.findByPk(facilityId);
    if (!facility) return null;
    return facility.get({ plain: true });
  }

  async listFacilities(tenantId = null) {
    const where = tenantId ? { tenant_id: tenantId } : {};
    const facilities = await db.Facility.findAll({ where });
    return facilities.map((f) => f.get({ plain: true }));
  }

  async createUnit(data) {
    if (!data.name || !data.code) {
      throw new Error("Unit name and code are required");
    }

    const unit = await db.Unit.create({
      unit_id: data.unit_id || uuidv4(),
      department_id: data.department_id || null,
      facility_id: data.facility_id || null,
      tenant_id: data.tenant_id || "DEFAULT_HOSPITAL",
      name: data.name,
      code: data.code,
      status: data.status || "ACTIVE",
    });

    return unit.get({ plain: true });
  }

  async listUnits(where = {}) {
    const units = await db.Unit.findAll({ where });
    return units.map((u) => u.get({ plain: true }));
  }

  async getFacilityHierarchy(facilityId) {
    const facility = await db.Facility.findByPk(facilityId, {
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
    });

    if (!facility) return null;
    return facility.get({ plain: true });
  }
}

module.exports = new FacilityHierarchyService();
