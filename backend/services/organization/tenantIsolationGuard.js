"use strict";

class TenantIsolationGuard {
  /**
   * Validate runtime object against current user/request tenant and facility context.
   */
  validateRuntimeAccess(runtimeObject, contextTenantId, contextFacilityId = null, isSuperAdmin = false) {
    if (isSuperAdmin) return true;

    if (!runtimeObject) {
      return true;
    }

    const obj = typeof runtimeObject.get === "function" ? runtimeObject.get({ plain: true }) : runtimeObject;

    const objTenantId = obj.tenant_id;
    if (objTenantId && contextTenantId && String(objTenantId) !== String(contextTenantId)) {
      const err = new Error(`Cross-tenant access blocked: object tenant (${objTenantId}) does not match request tenant (${contextTenantId})`);
      err.status = 403;
      err.code = "CROSS_TENANT_ACCESS_DENIED";
      throw err;
    }

    const objFacilityId = obj.facility_id;
    if (objFacilityId && contextFacilityId && String(objFacilityId) !== String(contextFacilityId)) {
      const err = new Error(`Cross-facility access blocked: object facility (${objFacilityId}) does not match request facility (${contextFacilityId})`);
      err.status = 403;
      err.code = "CROSS_FACILITY_ACCESS_DENIED";
      throw err;
    }

    return true;
  }

  /**
   * Enforce tenant_id & facility_id on a new runtime clinical object during creation.
   */
  prepareRuntimeObject(data, contextTenantId = "DEFAULT_HOSPITAL", contextFacilityId = null) {
    return {
      ...data,
      tenant_id: data.tenant_id || contextTenantId || "DEFAULT_HOSPITAL",
      facility_id: data.facility_id || contextFacilityId || null,
    };
  }

  /**
   * Append tenant and facility filters to a Sequelize query where clause.
   */
  applyTenantScope(where = {}, tenantId = null, facilityId = null) {
    const scoped = { ...where };
    if (tenantId) {
      scoped.tenant_id = tenantId;
    }
    if (facilityId) {
      scoped.facility_id = facilityId;
    }
    return scoped;
  }
}

module.exports = new TenantIsolationGuard();
