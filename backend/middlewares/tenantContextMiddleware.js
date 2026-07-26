"use strict";

const tenantContextMiddleware = (req, res, next) => {
  const headerTenantId = req.headers["x-tenant-id"];
  const headerFacilityId = req.headers["x-facility-id"];

  const queryTenantId = req.query?.tenant_id;
  const queryFacilityId = req.query?.facility_id;

  const userTenantId = req.user?.tenant_id;
  const userFacilityId = req.user?.facility_id;

  const tenant_id = headerTenantId || queryTenantId || userTenantId || "DEFAULT_HOSPITAL";
  const facility_id = headerFacilityId || queryFacilityId || userFacilityId || null;

  req.tenant_id = String(tenant_id);
  req.facility_id = facility_id ? String(facility_id) : null;
  req.tenantContext = {
    tenant_id: req.tenant_id,
    facility_id: req.facility_id,
  };

  next();
};

module.exports = tenantContextMiddleware;
