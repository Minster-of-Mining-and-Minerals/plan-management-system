"use strict";

const companyProductionService = require("../../services/production/companyProductionService");

/**
 * List company production assignments.
 */
async function listAssignmentsHandler(req, res, next) {
  try {
    const query = { ...req.query };
    // If authenticated user is scoped to a company, lock to their company
    if (req.user && req.user.company_id) {
      query.company_id = req.user.company_id;
    }

    const assignments = await companyProductionService.listAssignments(query);
    return res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get an assignment by ID.
 */
async function getAssignmentByIdHandler(req, res, next) {
  try {
    const assignment = await companyProductionService.getAssignmentById(req.params.id);

    // Company scope isolation
    if (req.user && req.user.company_id && assignment.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access assignments belonging to another company.",
      });
    }

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new company production assignment (Federal Admin only).
 */
async function createAssignmentHandler(req, res, next) {
  try {
    const assignment = await companyProductionService.createAssignment(
      req.body,
      req.user ? req.user.user_id : null
    );
    return res.status(201).json({
      success: true,
      message: "Company production assignment created successfully.",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an assignment (Federal Admin only).
 */
async function updateAssignmentHandler(req, res, next) {
  try {
    const assignment = await companyProductionService.updateAssignment(
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Company production assignment updated successfully.",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Save target hierarchy with revision versioning (Federal Admin only).
 */
async function saveTargetHierarchyHandler(req, res, next) {
  try {
    const { targets, revision_reason } = req.body;
    const assignmentId = req.params.id;

    const savedTargets = await companyProductionService.saveTargetHierarchy({
      assignmentId,
      targets,
      revisionReason: revision_reason,
      userId: req.user ? req.user.user_id : null,
    });

    return res.status(200).json({
      success: true,
      message: "Production target hierarchy saved successfully.",
      data: savedTargets,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Company proposes annual and distributed period targets (+ department tree allocation).
 */
async function saveTargetProposalHandler(req, res, next) {
  try {
    const companyScope = req.user && req.user.company_id ? req.user.company_id : null;
    const { annual_target, period_type, period_allocations, submission_notes, auto_submit } = req.body;
    const assignmentId = req.params.id;

    const result = await companyProductionService.saveTargetProposal({
      assignmentId,
      annualTarget: annual_target,
      periodType: period_type,
      periodAllocations: period_allocations,
      submissionNotes: submission_notes,
      userId: req.user ? req.user.user_id : null,
      autoSubmit: !!auto_submit,
      companyScope,
    });

    return res.status(200).json({
      success: true,
      message: auto_submit
        ? "Production target proposal submitted for Federal approval successfully."
        : "Production target proposal saved as draft successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit target proposal for Federal review.
 */
async function submitTargetProposalHandler(req, res, next) {
  try {
    const companyScope = req.user && req.user.company_id ? req.user.company_id : null;
    const { version_number, submission_notes } = req.body;
    const assignmentId = req.params.id;

    const result = await companyProductionService.submitTargetProposal({
      assignmentId,
      versionNumber: version_number,
      submissionNotes: submission_notes,
      userId: req.user ? req.user.user_id : null,
      companyScope,
    });

    return res.status(200).json({
      success: true,
      message: "Production target proposal submitted for Federal review successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Review target proposal (Federal / Private authority only: approve, request revision, reject).
 */
async function reviewTargetProposalHandler(req, res, next) {
  try {
    if (req.user && req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Company accounts cannot review or approve target proposals.",
      });
    }

    const { decision, review_comments, version_number } = req.body;
    const assignmentId = req.params.id;

    const result = await companyProductionService.reviewTargetProposal({
      assignmentId,
      versionNumber: version_number,
      decision,
      reviewComments: review_comments,
      userId: req.user ? req.user.user_id : null,
    });

    return res.status(200).json({
      success: true,
      message: `Production target proposal marked as ${decision} successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get approval history audit trail for an assignment's target proposals.
 */
async function getApprovalHistoryHandler(req, res, next) {
  try {
    const version = req.query.version ? parseInt(req.query.version, 10) : null;
    const history = await companyProductionService.getApprovalHistory(req.params.id, version);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manage reporting responsibilities (department, user, role).
 */
async function manageResponsibilitiesHandler(req, res, next) {
  try {
    const { responsibilities } = req.body;
    const assignmentId = req.params.id;

    const updated = await companyProductionService.manageReportingResponsibilities({
      assignmentId,
      responsibilities,
      userId: req.user ? req.user.user_id : null,
    });

    return res.status(200).json({
      success: true,
      message: "Production reporting responsibilities updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List reporting responsibilities.
 */
async function listResponsibilitiesHandler(req, res, next) {
  try {
    const responsibilities = await companyProductionService.listReportingResponsibilities(req.params.id);
    return res.status(200).json({
      success: true,
      data: responsibilities,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Comprehensive production detail view bundle.
 */
async function getProductionDetailHandler(req, res, next) {
  try {
    const companyScope = req.user && req.user.company_id ? req.user.company_id : null;
    const detail = await companyProductionService.getProductionDetail(req.params.id, companyScope);

    return res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get targets for an assignment.
 */
async function getTargetsByAssignmentHandler(req, res, next) {
  try {
    const assignment = await companyProductionService.getAssignmentById(req.params.id);

    if (req.user && req.user.company_id && assignment.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access targets belonging to another company.",
      });
    }

    const version = req.query.version ? parseInt(req.query.version, 10) : null;
    const targets = await companyProductionService.getTargetsByAssignment(req.params.id, version);

    return res.status(200).json({
      success: true,
      data: targets,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit daily or scheduled production report.
 */
async function submitReportHandler(req, res, next) {
  try {
    const companyScope = req.user && req.user.company_id ? req.user.company_id : null;
    const payload = { ...req.body };

    // If company user, enforce their company ID
    if (companyScope) {
      payload.company_id = companyScope;
    }

    const report = await companyProductionService.submitReport(
      payload,
      req.user ? req.user.user_id : null,
      companyScope
    );

    return res.status(201).json({
      success: true,
      message: "Production report submitted successfully.",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a report by ID.
 */
async function getReportByIdHandler(req, res, next) {
  try {
    const report = await companyProductionService.getReportById(req.params.id);

    if (req.user && req.user.company_id && report.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot view reports belonging to another company.",
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update / correct a report.
 */
async function updateReportHandler(req, res, next) {
  try {
    const companyScope = req.user && req.user.company_id ? req.user.company_id : null;
    const report = await companyProductionService.updateReport(
      req.params.id,
      req.body,
      req.user ? req.user.user_id : null,
      companyScope
    );

    return res.status(200).json({
      success: true,
      message: "Production report updated successfully.",
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Review / approve / reject a report.
 */
async function reviewReportHandler(req, res, next) {
  try {
    const { action, review_comments } = req.body;
    const report = await companyProductionService.reviewReport(
      req.params.id,
      { action, review_comments },
      req.user ? req.user.user_id : null
    );

    return res.status(200).json({
      success: true,
      message: `Production report ${action} successfully.`,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List production reports with pagination and filtering.
 */
async function listReportsHandler(req, res, next) {
  try {
    const companyScope = req.user && req.user.company_id ? req.user.company_id : null;
    const result = await companyProductionService.listReports(req.query, companyScope);

    return res.status(200).json({
      success: true,
      data: result.reports,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Calculation Engine: Get production performance against targets.
 */
async function getPerformanceHandler(req, res, next) {
  try {
    let companyId = req.query.company_id;
    if (req.user && req.user.company_id) {
      companyId = req.user.company_id;
    }

    if (!companyId || !req.query.production_item_id) {
      return res.status(400).json({
        success: false,
        message: "company_id and production_item_id are required query parameters.",
      });
    }

    const performance = await companyProductionService.calculateProductionPerformance({
      companyId,
      productionItemId: req.query.production_item_id,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      periodType: req.query.period_type || "quarter",
      periodLabel: req.query.period_label,
      asOfDate: req.query.as_of_date,
    });

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Federal Production Dashboard overview.
 */
async function getFederalDashboardHandler(req, res, next) {
  try {
    // Only federal accounts can view overall federal dashboard
    if (req.user && req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Company users cannot access the Federal Production Dashboard.",
      });
    }

    const dashboard = await companyProductionService.getFederalDashboard(req.query);
    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Company Production Dashboard overview.
 */
async function getCompanyDashboardHandler(req, res, next) {
  try {
    let companyId = req.params.companyId || req.query.company_id;

    if (req.user && req.user.company_id) {
      companyId = req.user.company_id;
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required.",
      });
    }

    const dashboard = await companyProductionService.getCompanyDashboard(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAssignmentsHandler,
  getAssignmentByIdHandler,
  createAssignmentHandler,
  updateAssignmentHandler,
  saveTargetHierarchyHandler,
  saveTargetProposalHandler,
  submitTargetProposalHandler,
  reviewTargetProposalHandler,
  getApprovalHistoryHandler,
  manageResponsibilitiesHandler,
  listResponsibilitiesHandler,
  getProductionDetailHandler,
  getTargetsByAssignmentHandler,
  submitReportHandler,
  getReportByIdHandler,
  updateReportHandler,
  reviewReportHandler,
  listReportsHandler,
  getPerformanceHandler,
  getFederalDashboardHandler,
  getCompanyDashboardHandler,
};
