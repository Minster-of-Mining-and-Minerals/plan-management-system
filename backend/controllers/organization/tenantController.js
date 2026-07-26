"use strict";

const organizationTenantService = require("../../services/organization/organizationTenantService");
const facilityHierarchyService = require("../../services/organization/facilityHierarchyService");
const userFacilityAssignmentService = require("../../services/organization/userFacilityAssignmentService");
const tenantBrandingService = require("../../services/organization/tenantBrandingService");
const patientEnterpriseIdentityService = require("../../services/patient/patientEnterpriseIdentityService");

class TenantController {
  // Tenant Handlers
  async createTenant(req, res) {
    try {
      const tenant = await organizationTenantService.createTenant(req.body);
      res.status(201).json({ success: true, data: tenant });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateTenant(req, res) {
    try {
      const tenant = await organizationTenantService.updateTenant(req.params.id, req.body);
      res.status(200).json({ success: true, data: tenant });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getTenant(req, res) {
    try {
      const tenant = await organizationTenantService.getTenantHierarchyTree(req.params.id);
      if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found" });
      res.status(200).json({ success: true, data: tenant });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async listTenants(req, res) {
    try {
      const tenants = await organizationTenantService.listTenants();
      res.status(200).json({ success: true, data: tenants });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Facility Handlers
  async createFacility(req, res) {
    try {
      const facilityData = { ...req.body, tenant_id: req.body.tenant_id || req.tenant_id };
      const facility = await facilityHierarchyService.createFacility(facilityData);
      res.status(201).json({ success: true, data: facility });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateFacility(req, res) {
    try {
      const facility = await facilityHierarchyService.updateFacility(req.params.id, req.body);
      res.status(200).json({ success: true, data: facility });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async listFacilities(req, res) {
    try {
      const tenantId = req.query.tenant_id || req.tenant_id;
      const facilities = await facilityHierarchyService.listFacilities(tenantId);
      res.status(200).json({ success: true, data: facilities });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getFacility(req, res) {
    try {
      const facility = await facilityHierarchyService.getFacilityHierarchy(req.params.id);
      if (!facility) return res.status(404).json({ success: false, message: "Facility not found" });
      res.status(200).json({ success: true, data: facility });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Unit Handlers
  async createUnit(req, res) {
    try {
      const unitData = { ...req.body, tenant_id: req.body.tenant_id || req.tenant_id };
      const unit = await facilityHierarchyService.createUnit(unitData);
      res.status(201).json({ success: true, data: unit });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async listUnits(req, res) {
    try {
      const units = await facilityHierarchyService.listUnits({ tenant_id: req.tenant_id });
      res.status(200).json({ success: true, data: units });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // User Facility Assignment Handlers
  async assignUserFacility(req, res) {
    try {
      const assignment = await userFacilityAssignmentService.assignUserToFacility(req.body);
      res.status(200).json({ success: true, data: assignment });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMyFacilityAssignments(req, res) {
    try {
      const userId = req.user?.user_id || req.query.user_id;
      if (!userId) return res.status(400).json({ success: false, message: "user_id required" });
      const assignments = await userFacilityAssignmentService.getUserAssignments(userId);
      res.status(200).json({ success: true, data: assignments });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Branding Handlers
  async getTenantBranding(req, res) {
    try {
      const tenantId = req.query.tenant_id || req.tenant_id || "DEFAULT_HOSPITAL";
      const branding = await tenantBrandingService.getBranding(tenantId);
      res.status(200).json({ success: true, data: branding });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateTenantBranding(req, res) {
    try {
      const tenantId = req.body.tenant_id || req.tenant_id;
      const branding = await tenantBrandingService.updateBranding(tenantId, req.body);
      res.status(200).json({ success: true, data: branding });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  // Patient Identity Handlers
  async registerPatientFacility(req, res) {
    try {
      const record = await patientEnterpriseIdentityService.registerPatientAtFacility(req.body);
      res.status(200).json({ success: true, data: record });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getGlobalPatientIdentity(req, res) {
    try {
      const patient = await patientEnterpriseIdentityService.getGlobalPatientIdentity(req.params.id);
      if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
      res.status(200).json({ success: true, data: patient });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new TenantController();
