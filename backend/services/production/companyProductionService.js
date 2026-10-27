"use strict";

const { Op } = require("sequelize");
const {
  Company,
  ProductionItem,
  ProductionItemUnit,
  ProductionReportingFrequency,
  CompanyProductionAssignment,
  CompanyProductionTarget,
  CompanyProductionReport,
  GoldMeasurementUnit,
  User,
  sequelize,
} = require("../../models");
const {
  roundDecimal,
  calculateAchievementPercentage,
  calculateRemaining,
} = require("./productionDecimalUtils");

/**
 * List assignments with optional filters.
 */
async function listAssignments(query = {}) {
  const where = {};
  if (query.company_id) where.company_id = query.company_id;
  if (query.production_item_id) where.production_item_id = query.production_item_id;
  if (query.is_active !== undefined) {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }

  return await CompanyProductionAssignment.findAll({
    where,
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["company_id", "name", "code"],
      },
      {
        model: ProductionItem,
        as: "productionItem",
        include: [
          { model: GoldMeasurementUnit, as: "baseUnit" },
          { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
          {
            model: ProductionItemUnit,
            as: "supportedUnits",
            include: [{ model: GoldMeasurementUnit, as: "measurementUnit" }],
          },
        ],
      },
      {
        model: ProductionReportingFrequency,
        as: "reportingFrequency",
      },
      {
        model: GoldMeasurementUnit,
        as: "defaultReportingUnit",
      },
      {
        model: CompanyProductionTarget,
        as: "targets",
        where: { status: "published" },
        required: false,
        include: [{ model: GoldMeasurementUnit, as: "unit" }],
      },
    ],
    order: [["created_at", "DESC"]],
  });
}

/**
 * Get assignment by ID.
 */
async function getAssignmentById(assignmentId) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["company_id", "name", "code"],
      },
      {
        model: ProductionItem,
        as: "productionItem",
        include: [
          { model: GoldMeasurementUnit, as: "baseUnit" },
          { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
          {
            model: ProductionItemUnit,
            as: "supportedUnits",
            include: [{ model: GoldMeasurementUnit, as: "measurementUnit" }],
          },
        ],
      },
      {
        model: ProductionReportingFrequency,
        as: "reportingFrequency",
      },
      {
        model: GoldMeasurementUnit,
        as: "defaultReportingUnit",
      },
      {
        model: CompanyProductionTarget,
        as: "targets",
        where: { status: "published" },
        required: false,
        include: [{ model: GoldMeasurementUnit, as: "unit" }],
      },
    ],
  });

  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }
  return assignment;
}

/**
 * Create a new company production assignment.
 */
async function createAssignment(data, userId) {
  const {
    company_id,
    production_item_id,
    reporting_frequency_id,
    target_allocation_depth,
    default_reporting_unit_id,
    effective_from,
    effective_to,
    requires_review,
    notes,
  } = data;

  if (!company_id || !production_item_id || !reporting_frequency_id || !effective_from) {
    const err = new Error("Company ID, production item, reporting frequency, and effective from date are required.");
    err.status = 400;
    throw err;
  }

  // Verify company exists
  const company = await Company.findByPk(company_id);
  if (!company) {
    const err = new Error("Company not found.");
    err.status = 404;
    throw err;
  }

  // Verify production item exists
  const item = await ProductionItem.findByPk(production_item_id);
  if (!item) {
    const err = new Error("Production item not found.");
    err.status = 404;
    throw err;
  }

  // Check duplicate active assignment
  const existing = await CompanyProductionAssignment.findOne({
    where: {
      company_id,
      production_item_id,
      is_active: true,
    },
  });
  if (existing) {
    const err = new Error("An active assignment for this company and production item already exists.");
    err.status = 409;
    throw err;
  }

  const assignment = await CompanyProductionAssignment.create({
    company_id,
    production_item_id,
    reporting_frequency_id,
    target_allocation_depth: target_allocation_depth || "quarterly",
    default_reporting_unit_id: default_reporting_unit_id || item.default_reporting_unit_id || item.base_unit_id,
    effective_from,
    effective_to: effective_to || null,
    requires_review: !!requires_review,
    notes: notes ? notes.trim() : null,
    created_by: userId,
    is_active: true,
  });

  return await getAssignmentById(assignment.assignment_id);
}

/**
 * Update assignment.
 */
async function updateAssignment(assignmentId, data) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found.");
    err.status = 404;
    throw err;
  }

  // Validate effective dates if modified
  const effFrom = data.effective_from || assignment.effective_from;
  const effTo = data.effective_to !== undefined ? data.effective_to : assignment.effective_to;
  if (effFrom && effTo && new Date(effTo) < new Date(effFrom)) {
    const err = new Error("Effective end date cannot be earlier than effective start date.");
    err.status = 400;
    throw err;
  }

  // Validate unit if modified
  if (data.default_reporting_unit_id) {
    const validUnit = await ProductionItemUnit.findOne({
      where: {
        production_item_id: assignment.production_item_id,
        unit_id: data.default_reporting_unit_id,
      },
    });
    if (!validUnit) {
      const err = new Error("The selected unit is not permitted for this production item.");
      err.status = 400;
      throw err;
    }
    assignment.default_reporting_unit_id = data.default_reporting_unit_id;
  }

  // Validate frequency if modified
  if (data.reporting_frequency_id) {
    const validFreq = await ProductionReportingFrequency.findByPk(data.reporting_frequency_id);
    if (!validFreq) {
      const err = new Error("The selected reporting frequency does not exist.");
      err.status = 400;
      throw err;
    }
    assignment.reporting_frequency_id = data.reporting_frequency_id;
  }

  if (data.target_allocation_depth) assignment.target_allocation_depth = data.target_allocation_depth;
  if (data.effective_from) assignment.effective_from = data.effective_from;
  if (data.effective_to !== undefined) assignment.effective_to = data.effective_to;
  if (data.requires_review !== undefined) assignment.requires_review = !!data.requires_review;
  if (data.notes !== undefined) assignment.notes = data.notes ? data.notes.trim() : null;
  if (data.is_active !== undefined) assignment.is_active = !!data.is_active;

  await assignment.save();
  return await getAssignmentById(assignmentId);
}

/**
 * Helper to compute unit factor to base for a production item.
 */
async function getUnitFactorToBase(productionItemId, unitId) {
  const itemUnit = await ProductionItemUnit.findOne({
    where: { production_item_id: productionItemId, unit_id: unitId },
  });
  if (itemUnit) {
    return Number(itemUnit.conversion_factor_to_base);
  }

  const item = await ProductionItem.findByPk(productionItemId, {
    include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
  });
  const targetUnit = await GoldMeasurementUnit.findByPk(unitId);
  if (item && targetUnit && item.baseUnit && item.baseUnit.conversion_factor > 0) {
    return Number(targetUnit.conversion_factor) / Number(item.baseUnit.conversion_factor);
  }
  return 1.0;
}

/**
 * Save target hierarchy with validation and revision versioning.
 */
async function saveTargetHierarchy({ assignmentId, targets, revisionReason, userId }) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [{ model: ProductionItem, as: "productionItem" }],
  });
  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    const err = new Error("At least one production target must be provided.");
    err.status = 400;
    throw err;
  }

  // Find latest version number
  const latestTarget = await CompanyProductionTarget.findOne({
    where: { assignment_id: assignmentId },
    order: [["version_number", "DESC"]],
  });
  const newVersion = latestTarget ? latestTarget.version_number + 1 : 1;

  await sequelize.transaction(async (t) => {
    // If there were existing published targets, mark them as superseded
    if (latestTarget) {
      await CompanyProductionTarget.update(
        { status: "superseded" },
        {
          where: {
            assignment_id: assignmentId,
            status: "published",
          },
          transaction: t,
        }
      );
    }

    const createdTargets = [];

    // Recursive helper to validate and insert target hierarchy
    async function insertTargetNode(node, parentTargetId = null, parentNode = null) {
      const {
        target_period_type,
        period_label,
        period_start_date,
        period_end_date,
        target_quantity,
        unit_id,
        children,
      } = node;

      if (!target_period_type || !period_label || !period_start_date || !period_end_date) {
        const err = new Error(`Target period details are incomplete for '${period_label || "unknown"}'.`);
        err.status = 400;
        throw err;
      }

      const numQuantity = Number(target_quantity);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        const err = new Error(`Target quantity for '${period_label}' must be a positive number.`);
        err.status = 400;
        throw err;
      }

      const targetUnitId = unit_id || assignment.default_reporting_unit_id;
      const factorToBase = await getUnitFactorToBase(assignment.production_item_id, targetUnitId);
      const targetQuantityBase = roundDecimal(numQuantity * factorToBase, 4);

      // Validate child period bounds inside parent
      if (parentNode) {
        if (
          new Date(period_start_date) < new Date(parentNode.period_start_date) ||
          new Date(period_end_date) > new Date(parentNode.period_end_date)
        ) {
          const err = new Error(
            `Child target period '${period_label}' (${period_start_date} to ${period_end_date}) must fall within parent period '${parentNode.period_label}' (${parentNode.period_start_date} to ${parentNode.period_end_date}).`
          );
          err.status = 400;
          throw err;
        }
      }

      // If children are provided, validate sum against parent
      if (Array.isArray(children) && children.length > 0) {
        let childSumBase = 0;
        for (const child of children) {
          const childQty = Number(child.target_quantity);
          if (isNaN(childQty) || childQty < 0) {
            const err = new Error(`Invalid child target quantity for '${child.period_label}'.`);
            err.status = 400;
            throw err;
          }
          const childUnitId = child.unit_id || targetUnitId;
          const childFactor = await getUnitFactorToBase(assignment.production_item_id, childUnitId);
          childSumBase += childQty * childFactor;
        }

        childSumBase = roundDecimal(childSumBase, 4);
        if (childSumBase > targetQuantityBase + 0.0001) {
          const err = new Error(
            `Child target allocation sum (${childSumBase} base units) exceeds parent target '${period_label}' (${targetQuantityBase} base units).`
          );
          err.status = 400;
          throw err;
        }
      }

      // Create target record
      const targetRecord = await CompanyProductionTarget.create(
        {
          assignment_id: assignmentId,
          parent_target_id: parentTargetId,
          version_number: newVersion,
          target_period_type,
          period_label,
          period_start_date,
          period_end_date,
          target_quantity: numQuantity,
          unit_id: targetUnitId,
          target_quantity_base: targetQuantityBase,
          status: "published",
          revision_reason: revisionReason || null,
          created_by: userId,
        },
        { transaction: t }
      );

      createdTargets.push(targetRecord);

      if (Array.isArray(children) && children.length > 0) {
        for (const child of children) {
          await insertTargetNode(child, targetRecord.target_id, node);
        }
      }
    }

    for (const rootTarget of targets) {
      await insertTargetNode(rootTarget, null, null);
    }
  });

  return await getTargetsByAssignment(assignmentId, newVersion);
}

/**
 * Get targets for an assignment by version.
 */
async function getTargetsByAssignment(assignmentId, versionNumber) {
  const where = { assignment_id: assignmentId };
  if (versionNumber) {
    where.version_number = versionNumber;
  } else {
    where.status = "published";
  }

  const allTargets = await CompanyProductionTarget.findAll({
    where,
    include: [{ model: GoldMeasurementUnit, as: "unit" }],
    order: [
      ["period_start_date", "ASC"],
      ["target_period_type", "ASC"],
    ],
  });

  return allTargets;
}

/**
 * Submit daily or scheduled production report.
 */
async function submitReport(data, userId, companyScope = null) {
  const {
    company_id,
    assignment_id,
    production_item_id,
    report_date,
    period_label,
    quantity_reported,
    reported_unit_id,
    notes,
  } = data;

  // Derive assignment if not explicitly provided
  let assignment;
  if (assignment_id) {
    assignment = await CompanyProductionAssignment.findByPk(assignment_id, {
      include: [
        { model: ProductionItem, as: "productionItem" },
        { model: ProductionReportingFrequency, as: "reportingFrequency" },
      ],
    });
  } else if (company_id && production_item_id) {
    assignment = await CompanyProductionAssignment.findOne({
      where: { company_id, production_item_id, is_active: true },
      include: [
        { model: ProductionItem, as: "productionItem" },
        { model: ProductionReportingFrequency, as: "reportingFrequency" },
      ],
    });
  }

  if (!assignment) {
    const err = new Error("No active company production assignment found for this company and production item.");
    err.status = 404;
    throw err;
  }

  // Security: If user is scoped to a specific company, strictly verify match
  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot submit reports for another company.");
    err.status = 403;
    throw err;
  }

  if (!report_date) {
    const err = new Error("Report date is required.");
    err.status = 400;
    throw err;
  }

  const numQty = Number(quantity_reported);
  if (isNaN(numQty) || numQty <= 0) {
    const err = new Error("Reported quantity must be a positive number.");
    err.status = 400;
    throw err;
  }

  // Check effective dates
  if (new Date(report_date) < new Date(assignment.effective_from)) {
    const err = new Error(`Report date cannot be earlier than assignment effective date (${assignment.effective_from}).`);
    err.status = 400;
    throw err;
  }
  if (assignment.effective_to && new Date(report_date) > new Date(assignment.effective_to)) {
    const err = new Error(`Report date cannot be later than assignment end date (${assignment.effective_to}).`);
    err.status = 400;
    throw err;
  }

  const unitId = reported_unit_id || assignment.default_reporting_unit_id;
  const factorToBase = await getUnitFactorToBase(assignment.production_item_id, unitId);
  const normalizedQuantity = roundDecimal(numQty * factorToBase, 4);

  // Duplicate check: check if an active report exists for same date, company, item
  const existingReport = await CompanyProductionReport.findOne({
    where: {
      company_id: assignment.company_id,
      production_item_id: assignment.production_item_id,
      report_date,
    },
  });
  if (existingReport) {
    const err = new Error(`A production report for ${report_date} has already been submitted for this item.`);
    err.status = 409;
    throw err;
  }

  // Resolve period label based on frequency if not provided
  const freqCode = assignment.reportingFrequency ? assignment.reportingFrequency.code : "daily";
  let resolvedPeriodLabel = period_label ? String(period_label).trim() : null;
  if (!resolvedPeriodLabel) {
    if (freqCode === "monthly") {
      resolvedPeriodLabel = report_date.slice(0, 7); // e.g. '2026-02'
    } else {
      resolvedPeriodLabel = report_date;
    }
  }

  const status = assignment.requires_review ? "submitted" : "approved";

  const report = await CompanyProductionReport.create({
    company_id: assignment.company_id,
    assignment_id: assignment.assignment_id,
    production_item_id: assignment.production_item_id,
    report_date,
    period_label: resolvedPeriodLabel,
    quantity_reported: numQty,
    reported_unit_id: unitId,
    normalized_quantity: normalizedQuantity,
    status,
    notes: notes ? notes.trim() : null,
    submitted_by: userId,
  });

  return await getReportById(report.report_id);
}

/**
 * Get report by ID.
 */
async function getReportById(reportId) {
  const report = await CompanyProductionReport.findByPk(reportId, {
    include: [
      { model: Company, as: "company", attributes: ["company_id", "name", "code"] },
      {
        model: ProductionItem,
        as: "productionItem",
        include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
      },
      { model: GoldMeasurementUnit, as: "reportedUnit" },
      { model: User, as: "submittedByUser", attributes: ["user_id", "full_name", "email"] },
      { model: User, as: "reviewedByUser", attributes: ["user_id", "full_name", "email"] },
    ],
  });

  if (!report) {
    const err = new Error("Production report not found.");
    err.status = 404;
    throw err;
  }
  return report;
}

/**
 * Update / correct a report.
 */
async function updateReport(reportId, data, userId, companyScope = null) {
  const report = await CompanyProductionReport.findByPk(reportId);
  if (!report) {
    const err = new Error("Production report not found.");
    err.status = 404;
    throw err;
  }

  if (companyScope && report.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot edit reports for another company.");
    err.status = 403;
    throw err;
  }

  if (data.quantity_reported !== undefined) {
    const numQty = Number(data.quantity_reported);
    if (isNaN(numQty) || numQty <= 0) {
      const err = new Error("Reported quantity must be a positive number.");
      err.status = 400;
      throw err;
    }
    report.quantity_reported = numQty;

    const unitId = data.reported_unit_id || report.reported_unit_id;
    const factorToBase = await getUnitFactorToBase(report.production_item_id, unitId);
    report.normalized_quantity = roundDecimal(numQty * factorToBase, 4);
    if (data.reported_unit_id) report.reported_unit_id = unitId;
  }

  if (data.notes !== undefined) report.notes = data.notes ? data.notes.trim() : null;

  await report.save();
  return await getReportById(reportId);
}

/**
 * Review / Approve / Reject report.
 */
async function reviewReport(reportId, { action, review_comments }, userId) {
  const report = await CompanyProductionReport.findByPk(reportId);
  if (!report) {
    const err = new Error("Production report not found.");
    err.status = 404;
    throw err;
  }

  if (!["approved", "rejected"].includes(action)) {
    const err = new Error("Review action must be either 'approved' or 'rejected'.");
    err.status = 400;
    throw err;
  }

  report.status = action;
  report.reviewed_by = userId;
  report.reviewed_at = new Date();
  report.review_comments = review_comments ? review_comments.trim() : null;

  await report.save();
  return await getReportById(reportId);
}

/**
 * List production reports with pagination and filtering.
 */
async function listReports(query = {}, companyScope = null) {
  const where = {};
  if (companyScope) {
    where.company_id = companyScope;
  } else if (query.company_id) {
    where.company_id = query.company_id;
  }

  if (query.production_item_id) where.production_item_id = query.production_item_id;
  if (query.assignment_id) where.assignment_id = query.assignment_id;
  if (query.status) where.status = query.status;

  if (query.start_date || query.end_date) {
    where.report_date = {};
    if (query.start_date) where.report_date[Op.gte] = query.start_date;
    if (query.end_date) where.report_date[Op.lte] = query.end_date;
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const offset = (page - 1) * limit;

  const { rows, count } = await CompanyProductionReport.findAndCountAll({
    where,
    include: [
      { model: Company, as: "company", attributes: ["company_id", "name", "code"] },
      {
        model: ProductionItem,
        as: "productionItem",
        include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
      },
      { model: GoldMeasurementUnit, as: "reportedUnit" },
      { model: User, as: "submittedByUser", attributes: ["user_id", "full_name", "email"] },
      { model: User, as: "reviewedByUser", attributes: ["user_id", "full_name", "email"] },
    ],
    order: [["report_date", "DESC"], ["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    reports: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Calculation Engine: Calculate production performance against targets for a period.
 */
async function calculateProductionPerformance({
  companyId,
  productionItemId,
  startDate,
  endDate,
  periodType = null,
  periodLabel = null,
  asOfDate = null,
}) {
  // 1. Fetch assignment and item
  const assignment = await CompanyProductionAssignment.findOne({
    where: {
      company_id: companyId,
      production_item_id: productionItemId,
      is_active: true,
    },
    include: [
      {
        model: ProductionItem,
        as: "productionItem",
        include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
      },
      { model: ProductionReportingFrequency, as: "reportingFrequency" },
      { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
    ],
  });

  if (!assignment) {
    return {
      has_assignment: false,
      message: "No active production assignment found for this company and item.",
    };
  }

  // 2. Fetch published target for the period
  const targetWhere = {
    assignment_id: assignment.assignment_id,
    status: "published",
  };
  if (periodLabel) {
    targetWhere.period_label = periodLabel;
  } else if (startDate && endDate) {
    targetWhere.period_start_date = { [Op.lte]: endDate };
    targetWhere.period_end_date = { [Op.gte]: startDate };
    if (periodType) targetWhere.target_period_type = periodType;
  } else if (periodType) {
    targetWhere.target_period_type = periodType;
  } else {
    targetWhere.target_period_type = "year";
  }

  let target = await CompanyProductionTarget.findOne({
    where: targetWhere,
    include: [{ model: GoldMeasurementUnit, as: "unit" }],
    order: [["version_number", "DESC"], ["period_start_date", "ASC"]],
  });

  // Fallback to any published target if year target is not present
  if (!target && !periodLabel && !startDate) {
    target = await CompanyProductionTarget.findOne({
      where: { assignment_id: assignment.assignment_id, status: "published" },
      include: [{ model: GoldMeasurementUnit, as: "unit" }],
      order: [["version_number", "DESC"], ["period_start_date", "ASC"]],
    });
  }

  // Effective period boundaries
  const effStart = startDate || (target ? target.period_start_date : assignment.effective_from);
  const effEnd = endDate || (target ? target.period_end_date : new Date().toISOString().slice(0, 10));

  // 3. Sum cumulative actual production reports in this period
  const reportWhere = {
    company_id: companyId,
    production_item_id: productionItemId,
    report_date: {
      [Op.gte]: effStart,
      [Op.lte]: effEnd,
    },
    status: { [Op.ne]: "rejected" },
  };

  const reports = await CompanyProductionReport.findAll({
    where: reportWhere,
    attributes: [
      "report_id",
      "report_date",
      "quantity_reported",
      "reported_unit_id",
      "normalized_quantity",
      "status",
    ],
    order: [["report_date", "ASC"]],
  });

  let totalActualBase = 0;
  for (const r of reports) {
    totalActualBase += Number(r.normalized_quantity || 0);
  }
  totalActualBase = roundDecimal(totalActualBase, 4);

  // Convert total actual into display unit (matching target's unit, or assignment default unit)
  const displayUnit = target ? target.unit : assignment.defaultReportingUnit || assignment.productionItem.baseUnit;
  const factorFromBaseToDisplay = await getUnitFactorToBase(productionItemId, displayUnit.unit_id);
  // displayUnit quantity = baseQty / factorFromBaseToDisplay
  const totalActualDisplay = roundDecimal(
    factorFromBaseToDisplay > 0 ? totalActualBase / factorFromBaseToDisplay : totalActualBase,
    4
  );

  let targetDisplay = null;
  let remainingQuantity = null;
  let achievementPercentage = null;
  let hasTarget = false;

  if (target) {
    hasTarget = true;
    targetDisplay = Number(target.target_quantity);
    remainingQuantity = calculateRemaining(totalActualDisplay, targetDisplay);
    achievementPercentage = calculateAchievementPercentage(totalActualDisplay, targetDisplay);
  }

  // 4. Frequency-Adaptive Reporting Compliance Calculation
  const todayStr = asOfDate || new Date().toISOString().slice(0, 10);
  const startDay = new Date(effStart);
  const endDay = new Date(effEnd > todayStr ? todayStr : effEnd);
  const freqCode = assignment.reportingFrequency ? assignment.reportingFrequency.code : "daily";

  let expectedReports = 0;
  // Future periods have 0 expected reports (not overdue)
  if (effStart <= todayStr && endDay >= startDay) {
    if (freqCode === "daily") {
      const diffTime = Math.max(0, endDay.getTime() - startDay.getTime());
      expectedReports = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } else if (freqCode === "weekly") {
      const diffTime = Math.max(0, endDay.getTime() - startDay.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      expectedReports = Math.max(1, Math.ceil(diffDays / 7));
    } else if (freqCode === "monthly") {
      const startYear = startDay.getUTCFullYear();
      const startMonth = startDay.getUTCMonth();
      const endYear = endDay.getUTCFullYear();
      const endMonth = endDay.getUTCMonth();
      expectedReports = Math.max(0, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
    } else if (freqCode === "quarterly") {
      const startYear = startDay.getUTCFullYear();
      const startQuarter = Math.floor(startDay.getUTCMonth() / 3);
      const endYear = endDay.getUTCFullYear();
      const endQuarter = Math.floor(endDay.getUTCMonth() / 3);
      expectedReports = Math.max(0, (endYear - startYear) * 4 + (endQuarter - startQuarter) + 1);
    } else if (freqCode === "annual") {
      const startYear = startDay.getUTCFullYear();
      const endYear = endDay.getUTCFullYear();
      expectedReports = Math.max(0, endYear - startYear + 1);
    }
  }

  const submittedReportCount = reports.length;
  const missingReportCount = Math.max(0, expectedReports - submittedReportCount);
  const complianceRate = expectedReports > 0 ? Math.min(100, roundDecimal((submittedReportCount / expectedReports) * 100, 1)) : 100;

  // 5. Projected Estimate / Expected Pace (clearly labeled as estimate)
  let projectedEstimate = null;
  if (hasTarget && targetDisplay > 0) {
    const periodFullDiff = Math.max(1, Math.floor((new Date(effEnd).getTime() - new Date(effStart).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const elapsedDiff = Math.max(0, Math.min(periodFullDiff, Math.floor((new Date(endDay).getTime() - new Date(effStart).getTime()) / (1000 * 60 * 60 * 24)) + 1));
    const expectedPaceToDate = roundDecimal((targetDisplay / periodFullDiff) * elapsedDiff, 4);
    const paceAchievement = expectedPaceToDate > 0 ? roundDecimal((totalActualDisplay / expectedPaceToDate) * 100, 2) : null;
    projectedEstimate = {
      is_estimate: true,
      label: "Projected Estimate (Calculated, Not Configured Target)",
      total_period_days: periodFullDiff,
      elapsed_days: elapsedDiff,
      expected_pace_to_date: expectedPaceToDate,
      pace_achievement_percentage: paceAchievement,
      projected_period_end_actual: elapsedDiff > 0 ? roundDecimal((totalActualDisplay / elapsedDiff) * periodFullDiff, 4) : 0,
    };
  }

  return {
    has_assignment: true,
    assignment_id: assignment.assignment_id,
    company_id: companyId,
    production_item: {
      production_item_id: assignment.productionItem.production_item_id,
      name: assignment.productionItem.name,
      code: assignment.productionItem.code,
      base_unit: assignment.productionItem.baseUnit,
    },
    period: {
      period_type: periodType,
      period_label: periodLabel || (target ? target.period_label : `${effStart} to ${effEnd}`),
      start_date: effStart,
      end_date: effEnd,
    },
    display_unit: {
      unit_id: displayUnit.unit_id,
      name: displayUnit.name,
      code: displayUnit.code,
      symbol: displayUnit.symbol,
    },
    has_target: hasTarget,
    target_quantity: targetDisplay,
    actual_quantity: totalActualDisplay,
    remaining_quantity: remainingQuantity,
    achievement_percentage: achievementPercentage,
    is_overachieved: hasTarget && targetDisplay > 0 ? totalActualDisplay > targetDisplay : false,
    projected_estimate: projectedEstimate,
    reporting_compliance: {
      frequency: freqCode,
      expected_reports: expectedReports,
      submitted_reports: submittedReportCount,
      missing_reports: missingReportCount,
      compliance_rate: complianceRate,
    },
    report_count: submittedReportCount,
    target_version: target ? target.version_number : null,
  };
}

/**
 * Federal Production Dashboard overview.
 */
async function getFederalDashboard(query = {}) {
  const whereAssignment = { is_active: true };
  if (query.company_id) whereAssignment.company_id = query.company_id;
  if (query.production_item_id) whereAssignment.production_item_id = query.production_item_id;

  const assignments = await CompanyProductionAssignment.findAll({
    where: whereAssignment,
    include: [
      { model: Company, as: "company", attributes: ["company_id", "name", "code"] },
      {
        model: ProductionItem,
        as: "productionItem",
        include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
      },
      { model: ProductionReportingFrequency, as: "reportingFrequency" },
      { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
      {
        model: CompanyProductionTarget,
        as: "targets",
        where: { status: "published" },
        required: false,
        include: [{ model: GoldMeasurementUnit, as: "unit" }],
      },
    ],
  });

  const assignmentSummaries = [];
  let totalCompanies = new Set();
  let totalItems = new Set();

  for (const assign of assignments) {
    totalCompanies.add(assign.company_id);
    totalItems.add(assign.production_item_id);

    // Calculate current quarter / annual performance
    const perf = await calculateProductionPerformance({
      companyId: assign.company_id,
      productionItemId: assign.production_item_id,
      startDate: query.start_date,
      endDate: query.end_date,
      periodLabel: query.period_label,
    });

    assignmentSummaries.push({
      assignment_id: assign.assignment_id,
      company: assign.company,
      production_item: assign.productionItem,
      reporting_frequency: assign.reportingFrequency,
      target_allocation_depth: assign.target_allocation_depth,
      performance: perf,
    });
  }

  // Recent reports
  const recentReports = await CompanyProductionReport.findAll({
    where: query.company_id ? { company_id: query.company_id } : {},
    include: [
      { model: Company, as: "company", attributes: ["company_id", "name", "code"] },
      { model: ProductionItem, as: "productionItem" },
      { model: GoldMeasurementUnit, as: "reportedUnit" },
    ],
    order: [["report_date", "DESC"], ["created_at", "DESC"]],
    limit: 10,
  });

  return {
    kpis: {
      active_assignments: assignments.length,
      reporting_companies: totalCompanies.size,
      active_production_items: totalItems.size,
    },
    assignments: assignmentSummaries,
    recent_reports: recentReports,
  };
}

/**
 * Company Production Dashboard overview.
 */
async function getCompanyDashboard(companyId, query = {}) {
  const assignments = await CompanyProductionAssignment.findAll({
    where: { company_id: companyId, is_active: true },
    include: [
      {
        model: ProductionItem,
        as: "productionItem",
        include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
      },
      { model: ProductionReportingFrequency, as: "reportingFrequency" },
      { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
      {
        model: CompanyProductionTarget,
        as: "targets",
        where: { status: "published" },
        required: false,
        include: [{ model: GoldMeasurementUnit, as: "unit" }],
      },
    ],
  });

  const itemPerformances = [];
  for (const assign of assignments) {
    const perf = await calculateProductionPerformance({
      companyId,
      productionItemId: assign.production_item_id,
      startDate: query.start_date,
      endDate: query.end_date,
      periodLabel: query.period_label,
    });

    itemPerformances.push({
      assignment: assign,
      performance: perf,
    });
  }

  // Recent reports for this company
  const recentReports = await CompanyProductionReport.findAll({
    where: { company_id: companyId },
    include: [
      { model: ProductionItem, as: "productionItem" },
      { model: GoldMeasurementUnit, as: "reportedUnit" },
    ],
    order: [["report_date", "DESC"], ["created_at", "DESC"]],
    limit: 15,
  });

  return {
    company_id: companyId,
    active_assignments_count: assignments.length,
    performances: itemPerformances,
    recent_reports: recentReports,
  };
}

module.exports = {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  saveTargetHierarchy,
  getTargetsByAssignment,
  submitReport,
  getReportById,
  updateReport,
  reviewReport,
  listReports,
  calculateProductionPerformance,
  getFederalDashboard,
  getCompanyDashboard,
};
