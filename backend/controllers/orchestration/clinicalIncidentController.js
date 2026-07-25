"use strict";

const clinicalIncidentEngine = require("../../services/orchestration/clinicalIncidentEngine");
const clinicalOperationalRulesEngine = require("../../services/orchestration/clinicalOperationalRulesEngine");
const incidentAssignmentEngine = require("../../services/orchestration/incidentAssignmentEngine");
const operationalPlaybookService = require("../../services/orchestration/operationalPlaybookService");
const hospitalAutomationEngine = require("../../services/orchestration/hospitalAutomationEngine");
const crossDomainCoordinator = require("../../services/orchestration/crossDomainCoordinator");
const operationalCommunicationHub = require("../../services/orchestration/operationalCommunicationHub");
const incidentAnalyticsService = require("../../services/orchestration/incidentAnalyticsService");
const executiveIncidentDashboardService = require("../../services/orchestration/executiveIncidentDashboardService");

class ClinicalIncidentController {
  async getIncidents(req, res, next) {
    try {
      const data = await clinicalIncidentEngine.getIncidents(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createIncident(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalIncidentEngine.createIncident(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateIncidentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, resolution_notes, root_cause } = req.body;
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalIncidentEngine.updateIncidentStatus(id, status, { resolution_notes, root_cause }, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async assignIncident(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id || req.user?.id;
      const data = await incidentAssignmentEngine.assignIncident(id, req.body, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async evaluateOperationalRules(req, res, next) {
    try {
      const data = await clinicalOperationalRulesEngine.evaluateOperationalRules();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPlaybooks(req, res, next) {
    try {
      const { incidentType } = req.query;
      const data = await operationalPlaybookService.getPlaybooks(incidentType);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async executePlaybookStep(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await operationalPlaybookService.executePlaybookStep(req.body, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async executeAutomationAction(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await hospitalAutomationEngine.executeAutomationAction(req.body, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async evaluateCrossDomainImpact(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await crossDomainCoordinator.evaluateCrossDomainImpact(req.body, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req, res, next) {
    try {
      const data = await operationalCommunicationHub.getMessages(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await operationalCommunicationHub.sendMessage(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getIncidentAnalytics(req, res, next) {
    try {
      const data = await incidentAnalyticsService.getIncidentAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getExecutiveIncidentSummary(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await executiveIncidentDashboardService.getExecutiveIncidentSummary(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalIncidentController();
