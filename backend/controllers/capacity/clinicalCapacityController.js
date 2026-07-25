"use strict";

const clinicalCapacityService = require("../../services/capacity/clinicalCapacityService");
const clinicalResourceAllocationService = require("../../services/capacity/clinicalResourceAllocationService");
const providerAvailabilityService = require("../../services/capacity/providerAvailabilityService");
const clinicalForecastService = require("../../services/capacity/clinicalForecastService");
const appointmentCapacityOptimizer = require("../../services/capacity/appointmentCapacityOptimizer");
const clinicalThroughputService = require("../../services/capacity/clinicalThroughputService");
const clinicalRecommendationService = require("../../services/capacity/clinicalRecommendationService");
const clinicalCapacityDashboardService = require("../../services/capacity/clinicalCapacityDashboardService");

class ClinicalCapacityController {
  async getHospitalCapacity(req, res, next) {
    try {
      const data = await clinicalCapacityService.getHospitalCapacity();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentCapacity(req, res, next) {
    try {
      const departmentId = req.query.departmentId || "LABORATORY";
      const data = await clinicalCapacityService.getDepartmentCapacity(departmentId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getProviderCapacity(req, res, next) {
    try {
      const { providerId } = req.params;
      const data = await clinicalCapacityService.getProviderCapacity(providerId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getProviderAvailability(req, res, next) {
    try {
      const { providerId } = req.params;
      const data = await providerAvailabilityService.getProviderAvailability(providerId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentAvailabilityBoard(req, res, next) {
    try {
      const departmentId = req.query.departmentId || "CONSULTATION";
      const data = await providerAvailabilityService.getDepartmentAvailabilityBoard(departmentId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getCapacityForecast(req, res, next) {
    try {
      const data = await clinicalForecastService.getCapacityForecast();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getAppointmentCapacityMetrics(req, res, next) {
    try {
      const data = await appointmentCapacityOptimizer.getAppointmentCapacityMetrics();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getThroughputMetrics(req, res, next) {
    try {
      const data = await clinicalThroughputService.getThroughputMetrics();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getOperationalRecommendations(req, res, next) {
    try {
      const data = await clinicalRecommendationService.getOperationalRecommendations();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async acceptRecommendation(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalRecommendationService.acceptRecommendation(id, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getExecutiveCapacityDashboard(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalCapacityDashboardService.getExecutiveCapacityDashboard(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async allocateResource(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalResourceAllocationService.allocateResource(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async releaseAssignment(req, res, next) {
    try {
      const { assignmentId } = req.body;
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalResourceAllocationService.releaseAssignment(assignmentId, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getActiveAssignments(req, res, next) {
    try {
      const data = await clinicalResourceAllocationService.getActiveAssignments(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalCapacityController();
