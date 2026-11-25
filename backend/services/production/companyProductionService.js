"use strict";

const { Op } = require("sequelize");
const {
  Company,
  CompanyLicense,
  LicenseType,
  ProductionItem,
  ProductionItemUnit,
  ProductionReportingFrequency,
  CompanyProductionAssignment,
  CompanyProductionTarget,
  CompanyProductionTargetAmendment,
  CompanyProductionReport,
  CompanyProductionTargetApprovalHistory,
  CompanyProductionReportingAssignment,
  CompanyStructure,
  Role,
  GoldMeasurementUnit,
  User,
  sequelize,
} = require("../../models");
const {
  roundDecimal,
  calculateAchievementPercentage,
  calculateRemaining,
} = require("./productionDecimalUtils");
const {
  calculateAllowanceWindow,
  classifyReportingDate,
  classifyPeriodRange,
  classifyReportingPeriod,
  buildTargetAlignedReportingHierarchy,
  buildDailyReportingMatrix,
  getBusinessToday,
} = require("./productionPeriodAccessService");

/**
 * List assignments with optional filters.
 */
async function listAssignments(query = {}) {
  const where = {};
  if (query.company_id) where.company_id = query.company_id;
  if (query.license_id) where.license_id = query.license_id;
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
        model: CompanyLicense,
        as: "license",
        attributes: [
          "license_id",
          "license_number",
          "license_name",
          "mineral_type",
          "region",
          "zone",
          "woreda",
          "status",
          "effective_start_date",
          "effective_end_date",
        ],
        include: [{ model: LicenseType, as: "licenseType", attributes: ["name", "code"] }],
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
        model: CompanyLicense,
        as: "license",
        attributes: [
          "license_id",
          "license_number",
          "license_name",
          "mineral_type",
          "region",
          "zone",
          "woreda",
          "status",
          "effective_start_date",
          "effective_end_date",
        ],
        include: [{ model: LicenseType, as: "licenseType", attributes: ["name", "code"] }],
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
    license_id,
    production_item_id,
    reporting_frequency_id,
    target_allocation_depth,
    default_reporting_unit_id,
    effective_from,
    effective_to,
    requires_review,
    allow_past_reporting,
    past_reporting_duration,
    past_reporting_unit,
    notes,
  } = data;

  if (!company_id || !license_id || !production_item_id || !reporting_frequency_id || !effective_from) {
    const err = new Error("Company ID, License, production item, reporting frequency, and effective start date are required.");
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

  // If license is specified, verify it and enforce strict validation
  if (license_id) {
    const license = await CompanyLicense.findByPk(license_id);
    if (!license) {
      const err = new Error("Company license not found.");
      err.status = 404;
      throw err;
    }
    if (license.company_id !== company_id) {
      const err = new Error("The specified license does not belong to this company.");
      err.status = 400;
      throw err;
    }
    if (license.status !== "active") {
      const err = new Error(
        `Cannot configure production reporting on license '${license.license_number}' with status '${license.status}'. Only active licenses can receive production reporting configurations.`
      );
      err.status = 400;
      throw err;
    }
    if (license.effective_start_date && new Date(effective_from) < new Date(license.effective_start_date)) {
      const err = new Error(
        `Assignment effective from date (${effective_from}) cannot be earlier than license effective start date (${license.effective_start_date}).`
      );
      err.status = 400;
      throw err;
    }
    if (license.effective_end_date && effective_to && new Date(effective_to) > new Date(license.effective_end_date)) {
      const err = new Error(
        `Assignment effective to date (${effective_to}) cannot exceed license effective end date (${license.effective_end_date}).`
      );
      err.status = 400;
      throw err;
    }
  }

  // Verify production item exists
  const item = await ProductionItem.findByPk(production_item_id);
  if (!item) {
    const err = new Error("Production item not found.");
    err.status = 404;
    throw err;
  }

  // Check duplicate active assignment
  const duplicateWhere = {
    production_item_id,
    is_active: true,
  };
  if (license_id) {
    duplicateWhere.license_id = license_id;
  } else {
    duplicateWhere.company_id = company_id;
  }

  const existing = await CompanyProductionAssignment.findOne({
    where: duplicateWhere,
  });
  if (existing) {
    const err = new Error(
      license_id
        ? "An active assignment for this production item already exists on this license."
        : "An active assignment for this company and production item already exists."
    );
    err.status = 409;
    throw err;
  }

  const assignment = await CompanyProductionAssignment.create({
    company_id,
    license_id: license_id || null,
    production_item_id,
    reporting_frequency_id,
    target_allocation_depth: target_allocation_depth || "quarterly",
    default_reporting_unit_id: default_reporting_unit_id || item.default_reporting_unit_id || item.base_unit_id,
    effective_from,
    effective_to: effective_to || null,
    requires_review: !!requires_review,
    allow_past_reporting: !!allow_past_reporting,
    past_reporting_duration: past_reporting_duration !== undefined ? Number(past_reporting_duration) : 0,
    past_reporting_unit: past_reporting_unit || "days",
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
    if (data.default_reporting_unit_id !== assignment.default_reporting_unit_id) {
      const item = await ProductionItem.findByPk(assignment.production_item_id);
      const validUnit = await ProductionItemUnit.findOne({
        where: {
          production_item_id: assignment.production_item_id,
          unit_id: data.default_reporting_unit_id,
        },
      });
      const isDirectItemUnit =
        item &&
        (item.base_unit_id === data.default_reporting_unit_id ||
          item.default_reporting_unit_id === data.default_reporting_unit_id);
      const measurementUnitExists = await GoldMeasurementUnit.findByPk(
        data.default_reporting_unit_id
      );

      if (!validUnit && !isDirectItemUnit && !measurementUnitExists) {
        const err = new Error("The selected unit is not permitted for this production item.");
        err.status = 400;
        throw err;
      }

      // Auto-create/link in ProductionItemUnit if missing
      if (!validUnit && (isDirectItemUnit || measurementUnitExists)) {
        await ProductionItemUnit.findOrCreate({
          where: {
            production_item_id: assignment.production_item_id,
            unit_id: data.default_reporting_unit_id,
          },
          defaults: {
            conversion_factor_to_base: 1.0,
            is_default: false,
            is_active: true,
          },
        }).catch(() => {});
      }

      assignment.default_reporting_unit_id = data.default_reporting_unit_id;
    }
  }

  // Ensure current assigned unit has a ProductionItemUnit record
  if (assignment.default_reporting_unit_id) {
    await ProductionItemUnit.findOrCreate({
      where: {
        production_item_id: assignment.production_item_id,
        unit_id: assignment.default_reporting_unit_id,
      },
      defaults: {
        conversion_factor_to_base: 1.0,
        is_default: true,
        is_active: true,
      },
    }).catch(() => {});
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

  if (data.license_id) {
    const license = await CompanyLicense.findByPk(data.license_id);
    if (!license) {
      const err = new Error("The specified license does not exist.");
      err.status = 404;
      throw err;
    }
    if (license.company_id !== assignment.company_id) {
      const err = new Error("The specified license does not belong to this company.");
      err.status = 400;
      throw err;
    }
    assignment.license_id = data.license_id;
  }
  if (data.target_allocation_depth) assignment.target_allocation_depth = data.target_allocation_depth;
  if (data.effective_from) assignment.effective_from = data.effective_from;
  if (data.effective_to !== undefined) assignment.effective_to = data.effective_to;
  if (data.requires_review !== undefined) assignment.requires_review = !!data.requires_review;
  if (data.allow_past_reporting !== undefined) assignment.allow_past_reporting = !!data.allow_past_reporting;
  if (data.past_reporting_duration !== undefined) assignment.past_reporting_duration = Number(data.past_reporting_duration);
  if (data.past_reporting_unit !== undefined) assignment.past_reporting_unit = data.past_reporting_unit;
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

  // 1. Target Approval Enforcement (Reporting is locked until target proposal is approved)
  const approvedTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignment.assignment_id,
      status: ["approved", "published"],
      target_period_type: "year",
    },
    order: [["version_number", "DESC"]],
  });

  if (!approvedTarget) {
    const err = new Error(
      "Production reporting is locked. The annual production target proposal for this license must be reviewed and approved by the Federal Ministry before periodic reports can be submitted."
    );
    err.status = 403;
    throw err;
  }

  // 2. License Validity Check
  if (assignment.license_id) {
    const license = await CompanyLicense.findByPk(assignment.license_id);
    if (!license || license.status !== "active") {
      const err = new Error(
        `Cannot submit production report. Associated license '${license ? license.license_number : assignment.license_id}' is not active (${license ? license.status : "missing"}).`
      );
      err.status = 403;
      throw err;
    }
    if (license.effective_start_date && new Date(report_date) < new Date(license.effective_start_date)) {
      const err = new Error(
        `Report date (${report_date}) is earlier than license effective start date (${license.effective_start_date}).`
      );
      err.status = 400;
      throw err;
    }
    if (license.effective_end_date && new Date(report_date) > new Date(license.effective_end_date)) {
      const err = new Error(
        `Report date (${report_date}) exceeds license effective end date (${license.effective_end_date}).`
      );
      err.status = 400;
      throw err;
    }
  }

  // 3. Reporting Responsibilities Authorization Check
  const activeResponsibilities = await CompanyProductionReportingAssignment.findAll({
    where: { assignment_id: assignment.assignment_id, is_active: true },
  });
  if (activeResponsibilities.length > 0 && userId) {
    const user = await User.findByPk(userId);
    const isPrivileged = user && (user.role === "company_admin" || user.role === "super_admin" || user.role === "admin");
    if (!isPrivileged) {
      const hasUserMatch = activeResponsibilities.some((r) => r.user_id === userId);
      const hasDeptMatch = activeResponsibilities.some(
        (r) => r.company_structure_id && user && user.company_structure_id === r.company_structure_id
      );
      const hasRoleMatch = activeResponsibilities.some((r) => r.role_id && user && user.role_id === r.role_id);
      if (!hasUserMatch && !hasDeptMatch && !hasRoleMatch) {
        const err = new Error(
          "Forbidden: You are not assigned reporting responsibilities for this production item."
        );
        err.status = 403;
        throw err;
      }
    }
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

  const freqCode = assignment.reportingFrequency ? assignment.reportingFrequency.code : "daily";

  // Check effective dates for daily reporting
  if (freqCode === "daily") {
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
  }

  // 4. Centralized Period Access and Frequency-Aware Period Window Enforcement

  // Look up target period allocation if specified or match by date
  let linkedTargetPeriod = null;
  if (data.target_period_id) {
    linkedTargetPeriod = await CompanyProductionTarget.findByPk(data.target_period_id);
  }
  if (!linkedTargetPeriod && approvedTarget) {
    linkedTargetPeriod = await CompanyProductionTarget.findOne({
      where: {
        assignment_id: assignment.assignment_id,
        version_number: approvedTarget.version_number,
        parent_target_id: approvedTarget.target_id,
        period_start_date: { [Op.lte]: report_date },
        period_end_date: { [Op.gte]: report_date },
      },
    });
  }

  const todayStr = getBusinessToday();
  const allowanceWindow = calculateAllowanceWindow(assignment, todayStr);
  const licenseRecord = assignment.license_id ? await CompanyLicense.findByPk(assignment.license_id) : null;
  const periodClassification = classifyReportingPeriod({
    frequencyCode: freqCode,
    dateStr: report_date,
    periodStartDate: linkedTargetPeriod?.period_start_date || null,
    periodEndDate: linkedTargetPeriod?.period_end_date || null,
    todayStr,
    allowanceWindow,
    license: licenseRecord,
    assignment,
    approvedTarget,
  });

  if (!periodClassification.isAccessible) {
    const err = new Error(periodClassification.reason || "Reporting period is locked.");
    err.status = 403;
    throw err;
  }

  const unitId = reported_unit_id || assignment.default_reporting_unit_id;
  const factorToBase = await getUnitFactorToBase(assignment.production_item_id, unitId);
  const normalizedQuantity = roundDecimal(numQty * factorToBase, 4);

  // Resolve period label and deterministic period key based on frequency
  let resolvedPeriodLabel = period_label ? String(period_label).trim() : null;
  let resolvedPeriodKey = data.reporting_period_key ? String(data.reporting_period_key).trim() : null;

  if (freqCode === "monthly") {
    const mKey = report_date.slice(0, 7);
    if (!resolvedPeriodLabel) resolvedPeriodLabel = mKey;
    if (!resolvedPeriodKey) resolvedPeriodKey = mKey;
  } else if (freqCode === "quarterly") {
    const qNum = Math.ceil(parseInt(report_date.slice(5, 7), 10) / 3);
    const qKey = `${report_date.slice(0, 4)}-Q${qNum}`;
    if (!resolvedPeriodLabel) resolvedPeriodLabel = qKey;
    if (!resolvedPeriodKey) resolvedPeriodKey = qKey;
  } else if (freqCode === "semi_annual") {
    const hNum = parseInt(report_date.slice(5, 7), 10) <= 6 ? 1 : 2;
    const hKey = `${report_date.slice(0, 4)}-H${hNum}`;
    if (!resolvedPeriodLabel) resolvedPeriodLabel = hKey;
    if (!resolvedPeriodKey) resolvedPeriodKey = hKey;
  } else if (freqCode === "annual") {
    const yKey = report_date.slice(0, 4);
    if (!resolvedPeriodLabel) resolvedPeriodLabel = yKey;
    if (!resolvedPeriodKey) resolvedPeriodKey = yKey;
  } else {
    // Daily
    if (!resolvedPeriodLabel) resolvedPeriodLabel = report_date;
    if (!resolvedPeriodKey) resolvedPeriodKey = report_date;
  }

  // Duplicate check: check if an active report exists for same period key, assignment
  const existingReport = await CompanyProductionReport.findOne({
    where: {
      assignment_id: assignment.assignment_id,
      [Op.or]: [
        { report_date },
        { reporting_period_key: resolvedPeriodKey },
      ],
    },
  });
  if (existingReport) {
    const err = new Error(`A production report for ${resolvedPeriodLabel} has already been submitted for this item.`);
    err.status = 409;
    throw err;
  }

  const resolvedTargetPeriodId = linkedTargetPeriod ? linkedTargetPeriod.target_id : (approvedTarget ? approvedTarget.target_id : null);

  const status = assignment.requires_review ? "submitted" : "approved";

  const report = await CompanyProductionReport.create({
    company_id: assignment.company_id,
    assignment_id: assignment.assignment_id,
    license_id: assignment.license_id || null,
    approved_target_version: approvedTarget ? approvedTarget.version_number : null,
    target_period_id: resolvedTargetPeriodId,
    reporting_frequency: freqCode,
    reporting_period_key: resolvedPeriodKey,
    company_structure_id: data.company_structure_id || null,
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
  assignmentId = null,
  startDate,
  endDate,
  periodType = null,
  periodLabel = null,
  asOfDate = null,
}) {
  // 1. Fetch assignment and item
  let assignment;
  if (assignmentId) {
    assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
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
  } else {
    // If not specified by assignmentId, find active assignments prioritizing the one with targets
    const assignments = await CompanyProductionAssignment.findAll({
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
        {
          model: CompanyProductionTarget,
          as: "targets",
          required: false,
        },
      ],
    });

    if (assignments.length > 0) {
      assignment = assignments.find((a) => a.targets && a.targets.length > 0) || assignments[0];
    }
  }

  if (!assignment) {
    return {
      has_assignment: false,
      message: "No active production assignment found for this company and item.",
    };
  }

  // 2. Fetch published or approved target for the period
  const targetWhere = {
    assignment_id: assignment.assignment_id,
    status: ["approved", "published"],
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

  // Fallback to any approved target if year target is not present
  if (!target && !periodLabel && !startDate) {
    target = await CompanyProductionTarget.findOne({
      where: { assignment_id: assignment.assignment_id, status: ["approved", "published"] },
      include: [{ model: GoldMeasurementUnit, as: "unit" }],
      order: [["version_number", "DESC"], ["period_start_date", "ASC"]],
    });
  }

  // Effective period boundaries
  const effStart = startDate || (target ? target.period_start_date : assignment.effective_from);
  const effEnd = endDate || (target ? target.period_end_date : new Date().toISOString().slice(0, 10));

  // 3. Sum cumulative actual production reports in this period strictly for this assignment
  const reportWhere = {
    assignment_id: assignment.assignment_id,
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
        required: false,
        include: [{ model: GoldMeasurementUnit, as: "unit" }],
      },
    ],
  });

  const assignmentSummaries = [];
  let totalCompanies = new Set();
  let totalItems = new Set();

  // Deduplicate assignments by unique (company_id, production_item_id) to eliminate 4x redundancy
  const uniqueItemMap = new Map();
  for (const assign of assignments) {
    totalCompanies.add(assign.company_id);
    totalItems.add(assign.production_item_id);

    const key = `${assign.company_id}_${assign.production_item_id}`;
    const existing = uniqueItemMap.get(key);
    const hasTargets = assign.targets && assign.targets.length > 0;
    if (!existing || (!existing.hasTargets && hasTargets)) {
      uniqueItemMap.set(key, { assign, hasTargets });
    }
  }

  for (const { assign } of uniqueItemMap.values()) {
    // Calculate current quarter / annual performance
    const perf = await calculateProductionPerformance({
      companyId: assign.company_id,
      productionItemId: assign.production_item_id,
      assignmentId: assign.assignment_id,
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
      active_assignments: uniqueItemMap.size,
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
        required: false,
        include: [{ model: GoldMeasurementUnit, as: "unit" }],
      },
    ],
  });

  // Group assignments by unique production_item_id to eliminate redundant cards for the same mineral/item
  const uniqueItemMap = new Map();
  for (const assign of assignments) {
    const itemId = assign.production_item_id;
    const existing = uniqueItemMap.get(itemId);
    const hasTargets = assign.targets && assign.targets.length > 0;
    if (!existing || (!existing.hasTargets && hasTargets)) {
      uniqueItemMap.set(itemId, { assign, hasTargets });
    }
  }

  const itemPerformances = [];
  for (const { assign } of uniqueItemMap.values()) {
    const perf = await calculateProductionPerformance({
      companyId,
      productionItemId: assign.production_item_id,
      assignmentId: assign.assignment_id,
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
    active_assignments_count: uniqueItemMap.size,
    performances: itemPerformances,
    recent_reports: recentReports,
  };
}


/**
 * Propose target hierarchy (annual target, period allocations, and optional department allocations).
 */
async function saveTargetProposal({
  assignmentId,
  annualTarget,
  periodType,
  periodAllocations,
  submissionNotes,
  userId,
  autoSubmit = false,
  companyScope = null,
}) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [
      { model: ProductionItem, as: "productionItem" },
      { model: CompanyLicense, as: "license" },
    ],
  });
  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }

  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot configure targets for another company.");
    err.status = 403;
    throw err;
  }

  // Validate license validity
  if (assignment.license) {
    if (assignment.license.status !== "active") {
      const err = new Error(`Cannot propose targets for inactive license '${assignment.license.license_number}'.`);
      err.status = 400;
      throw err;
    }
  }

  const numAnnual = Number(annualTarget);
  if (isNaN(numAnnual) || numAnnual <= 0) {
    const err = new Error("Annual production target must be a positive number.");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(periodAllocations) || periodAllocations.length === 0) {
    const err = new Error("At least one period allocation must be provided.");
    err.status = 400;
    throw err;
  }

  // Find latest target version
  const latestTarget = await CompanyProductionTarget.findOne({
    where: { assignment_id: assignmentId, target_period_type: "year" },
    order: [["version_number", "DESC"]],
  });

  let targetVersion = 1;
  if (latestTarget) {
    if (latestTarget.status === "approved" || latestTarget.status === "published") {
      const err = new Error(
        `Target Version ${latestTarget.version_number} is officially APPROVED and permanently locked against direct modifications. To adjust targets, please submit a formal Target Amendment Request.`
      );
      err.status = 403;
      throw err;
    } else if (latestTarget.status === "submitted" || latestTarget.status === "under_review") {
      const err = new Error(
        `A target proposal (Version ${latestTarget.version_number}) is currently under review by the Federal Ministry. You cannot modify it until a review decision is issued.`
      );
      err.status = 400;
      throw err;
    } else {
      // draft or revision_requested or rejected -> update existing version
      targetVersion = latestTarget.version_number;
    }
  }

  // Validate sum of period allocations equals annual target
  let totalPeriodSum = 0;
  for (const p of periodAllocations) {
    const pQty = Number(p.target_quantity);
    if (isNaN(pQty) || pQty < 0) {
      const err = new Error(`Invalid target quantity for period '${p.period_label}'.`);
      err.status = 400;
      throw err;
    }
    totalPeriodSum += pQty;

    // If department allocations provided for this period, validate child sum
    if (Array.isArray(p.department_allocations) && p.department_allocations.length > 0) {
      let deptSum = 0;
      for (const d of p.department_allocations) {
        const dQty = Number(d.target_quantity);
        if (isNaN(dQty) || dQty < 0) {
          const err = new Error(`Invalid department target quantity in '${p.period_label}'.`);
          err.status = 400;
          throw err;
        }
        deptSum += dQty;
      }
      deptSum = roundDecimal(deptSum, 4);
      if (Math.abs(deptSum - roundDecimal(pQty, 4)) > 0.0001) {
        const err = new Error(
          `Department allocations total (${deptSum}) does not match period target '${p.period_label}' (${pQty}).`
        );
        err.status = 400;
        throw err;
      }
    }
  }

  totalPeriodSum = roundDecimal(totalPeriodSum, 4);
  const roundedAnnual = roundDecimal(numAnnual, 4);
  if (Math.abs(totalPeriodSum - roundedAnnual) > 0.0001) {
    const err = new Error(
      `Sum of period allocations (${totalPeriodSum}) does not equal the annual target (${roundedAnnual}).`
    );
    err.status = 400;
    throw err;
  }

  const initialStatus = autoSubmit ? "submitted" : "draft";
  const unitId = assignment.default_reporting_unit_id;
  const factorToBase = await getUnitFactorToBase(assignment.production_item_id, unitId);
  const annualQuantityBase = roundDecimal(numAnnual * factorToBase, 4);

  // Derive start/end dates from allocations
  const sortedStarts = [...periodAllocations].map((p) => p.period_start_date).sort();
  const sortedEnds = [...periodAllocations].map((p) => p.period_end_date).sort();
  const yearStart = sortedStarts[0] || assignment.effective_from;
  const yearEnd = sortedEnds[sortedEnds.length - 1] || assignment.effective_to || yearStart;
  const yearLabel = String(new Date(yearStart).getFullYear() || "Annual Target");

  await sequelize.transaction(async (t) => {
    // Delete existing targets for this specific (assignmentId, targetVersion) if overwriting draft/revision
    await CompanyProductionTarget.destroy({
      where: { assignment_id: assignmentId, version_number: targetVersion },
      transaction: t,
    });

    // 1. Root Annual Target
    const rootTarget = await CompanyProductionTarget.create(
      {
        assignment_id: assignmentId,
        parent_target_id: null,
        company_structure_id: null,
        version_number: targetVersion,
        target_period_type: "year",
        period_label: yearLabel,
        period_start_date: yearStart,
        period_end_date: yearEnd,
        target_quantity: numAnnual,
        unit_id: unitId,
        target_quantity_base: annualQuantityBase,
        status: initialStatus,
        submission_notes: submissionNotes || null,
        submitted_by: autoSubmit ? userId : null,
        submitted_at: autoSubmit ? new Date() : null,
        created_by: userId,
      },
      { transaction: t }
    );

    // 2. Child Period Targets
    for (const p of periodAllocations) {
      const pQty = Number(p.target_quantity);
      const pQtyBase = roundDecimal(pQty * factorToBase, 4);
      const periodRecord = await CompanyProductionTarget.create(
        {
          assignment_id: assignmentId,
          parent_target_id: rootTarget.target_id,
          company_structure_id: null,
          version_number: targetVersion,
          target_period_type: p.target_period_type || periodType || assignment.target_allocation_depth || "quarter",
          period_label: p.period_label,
          period_start_date: p.period_start_date,
          period_end_date: p.period_end_date,
          target_quantity: pQty,
          unit_id: unitId,
          target_quantity_base: pQtyBase,
          status: initialStatus,
          submission_notes: submissionNotes || null,
          submitted_by: autoSubmit ? userId : null,
          submitted_at: autoSubmit ? new Date() : null,
          created_by: userId,
        },
        { transaction: t }
      );

      // 3. Department child allocations under this period
      if (Array.isArray(p.department_allocations) && p.department_allocations.length > 0) {
        for (const d of p.department_allocations) {
          const dQty = Number(d.target_quantity);
          const dQtyBase = roundDecimal(dQty * factorToBase, 4);
          await CompanyProductionTarget.create(
            {
              assignment_id: assignmentId,
              parent_target_id: periodRecord.target_id,
              company_structure_id: d.company_structure_id,
              version_number: targetVersion,
              target_period_type: p.target_period_type || periodType || assignment.target_allocation_depth || "quarter",
              period_label: `${p.period_label} - Dept`,
              period_start_date: p.period_start_date,
              period_end_date: p.period_end_date,
              target_quantity: dQty,
              unit_id: unitId,
              target_quantity_base: dQtyBase,
              status: initialStatus,
              created_by: userId,
            },
            { transaction: t }
          );
        }
      }
    }

    // If autoSubmit, record in approval history
    if (autoSubmit) {
      await CompanyProductionTargetApprovalHistory.create(
        {
          assignment_id: assignmentId,
          version_number: targetVersion,
          action: "submitted",
          previous_status: latestTarget ? latestTarget.status : "draft",
          new_status: "submitted",
          comments: submissionNotes || "Target proposal submitted for Federal review.",
          actor_id: userId,
        },
        { transaction: t }
      );
    }
  });

  return await getTargetProposal(assignmentId, targetVersion);
}

/**
 * Submit target proposal to Federal level for review.
 */
async function submitTargetProposal({ assignmentId, versionNumber, submissionNotes, userId, companyScope = null }) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found.");
    err.status = 404;
    throw err;
  }
  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot submit targets for another company.");
    err.status = 403;
    throw err;
  }

  const ver = versionNumber || 1;
  const targets = await CompanyProductionTarget.findAll({
    where: { assignment_id: assignmentId, version_number: ver },
  });
  if (targets.length === 0) {
    const err = new Error("No target proposal found for version " + ver);
    err.status = 404;
    throw err;
  }

  const rootTarget = targets.find((t) => t.target_period_type === "year");
  const previousStatus = rootTarget ? rootTarget.status : "draft";

  if (previousStatus === "submitted" || previousStatus === "under_review") {
    const err = new Error("This target proposal has already been submitted and is currently under review.");
    err.status = 400;
    throw err;
  }

  await sequelize.transaction(async (t) => {
    await CompanyProductionTarget.update(
      {
        status: "submitted",
        submission_notes: submissionNotes || (rootTarget ? rootTarget.submission_notes : null),
        submitted_by: userId,
        submitted_at: new Date(),
      },
      {
        where: { assignment_id: assignmentId, version_number: ver },
        transaction: t,
      }
    );

    await CompanyProductionTargetApprovalHistory.create(
      {
        assignment_id: assignmentId,
        version_number: ver,
        action: "submitted",
        previous_status: previousStatus,
        new_status: "submitted",
        comments: submissionNotes || "Submitted target proposal for Federal approval.",
        actor_id: userId,
      },
      { transaction: t }
    );
  });

  return await getTargetProposal(assignmentId, ver);
}

/**
 * Review target proposal (Federal/Private authority only).
 */
async function reviewTargetProposal({ assignmentId, versionNumber, decision, reviewComments, userId }) {
  const validDecisions = ["approved", "revision_requested", "rejected", "under_review"];
  if (!validDecisions.includes(decision)) {
    const err = new Error(`Invalid review decision '${decision}'. Must be one of: ${validDecisions.join(", ")}`);
    err.status = 400;
    throw err;
  }

  if (
    (decision === "rejected" || decision === "revision_requested") &&
    (!reviewComments || !reviewComments.trim())
  ) {
    const err = new Error(
      `A detailed review comment / justification is mandatory when issuing a ${decision.replace("_", " ")} decision.`
    );
    err.status = 400;
    throw err;
  }

  const assignment = await CompanyProductionAssignment.findByPk(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found.");
    err.status = 404;
    throw err;
  }

  const ver = versionNumber || 1;
  const targets = await CompanyProductionTarget.findAll({
    where: { assignment_id: assignmentId, version_number: ver },
  });
  if (targets.length === 0) {
    const err = new Error("No target proposal found for version " + ver);
    err.status = 404;
    throw err;
  }

  const rootTarget = targets.find((t) => t.target_period_type === "year");
  const previousStatus = rootTarget ? rootTarget.status : "submitted";

  await sequelize.transaction(async (t) => {
    // If approved, supersede any previous approved/published targets for this assignment
    if (decision === "approved") {
      await CompanyProductionTarget.update(
        { status: "superseded" },
        {
          where: {
            assignment_id: assignmentId,
            status: ["approved", "published"],
            version_number: { [Op.ne]: ver },
          },
          transaction: t,
        }
      );
    }

    // Update targets for this version
    await CompanyProductionTarget.update(
      {
        status: decision,
        reviewed_by: userId,
        reviewed_at: new Date(),
        review_comments: reviewComments || null,
      },
      {
        where: { assignment_id: assignmentId, version_number: ver },
        transaction: t,
      }
    );

    // Record approval history
    await CompanyProductionTargetApprovalHistory.create(
      {
        assignment_id: assignmentId,
        version_number: ver,
        action: decision,
        previous_status: previousStatus,
        new_status: decision,
        comments: reviewComments || `Target proposal ${decision} by Federal Reviewer.`,
        actor_id: userId,
      },
      { transaction: t }
    );
  });

  return await getTargetProposal(assignmentId, ver);
}

/**
 * Retrieve target proposal tree by version.
 */
async function getTargetProposal(assignmentId, versionNumber = null) {
  const where = { assignment_id: assignmentId };
  if (versionNumber) {
    where.version_number = versionNumber;
  }

  const allTargets = await CompanyProductionTarget.findAll({
    where,
    include: [
      { model: GoldMeasurementUnit, as: "unit" },
      { model: CompanyStructure, as: "department", attributes: ["company_structure_id", "name", "level"] },
      { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
      { model: User, as: "reviewer", attributes: ["user_id", "full_name", "email"] },
    ],
    order: [
      ["version_number", "DESC"],
      ["period_start_date", "ASC"],
    ],
  });

  if (allTargets.length === 0) return null;

  const targetVersion = versionNumber || allTargets[0].version_number;
  const versionTargets = allTargets.filter((t) => t.version_number === targetVersion);

  const rootNode = versionTargets.find((t) => t.target_period_type === "year" && !t.parent_target_id);
  const periodNodes = versionTargets.filter(
    (t) => t.parent_target_id === (rootNode ? rootNode.target_id : null)
  );

  const periodsWithDepts = periodNodes.map((p) => {
    const depts = versionTargets.filter((t) => t.parent_target_id === p.target_id);
    return {
      ...p.toJSON(),
      department_allocations: depts.map((d) => d.toJSON()),
    };
  });

  return {
    version_number: targetVersion,
    status: rootNode ? rootNode.status : versionTargets[0].status,
    root: rootNode ? rootNode.toJSON() : null,
    annual_target: rootNode ? Number(rootNode.target_quantity) : null,
    unit: rootNode ? rootNode.unit : null,
    submission_notes: rootNode ? rootNode.submission_notes : null,
    review_comments: rootNode ? rootNode.review_comments : null,
    submitted_at: rootNode ? rootNode.submitted_at : null,
    submitted_by: rootNode ? rootNode.submitter : null,
    reviewed_at: rootNode ? rootNode.reviewed_at : null,
    reviewed_by: rootNode ? rootNode.reviewer : null,
    periods: periodsWithDepts,
    all_targets: versionTargets,
  };
}

/**
 * Get approval history for an assignment.
 */
async function getApprovalHistory(assignmentId, versionNumber = null) {
  const where = { assignment_id: assignmentId };
  if (versionNumber) {
    where.version_number = versionNumber;
  }

  return await CompanyProductionTargetApprovalHistory.findAll({
    where,
    include: [
      { model: User, as: "actor", attributes: ["user_id", "full_name", "email"] },
      {
        model: CompanyProductionTargetAmendment,
        as: "amendment",
        attributes: ["amendment_id", "amendment_reference", "status", "amendment_reason"],
      },
    ],
    order: [["created_at", "ASC"]],
  });
}

/**
 * Manage reporting responsibilities.
 */
async function manageReportingResponsibilities({ assignmentId, responsibilities, userId }) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found.");
    err.status = 404;
    throw err;
  }

  await sequelize.transaction(async (t) => {
    // Soft delete existing responsibilities
    await CompanyProductionReportingAssignment.destroy({
      where: { assignment_id: assignmentId },
      transaction: t,
    });

    if (Array.isArray(responsibilities) && responsibilities.length > 0) {
      for (const r of responsibilities) {
        await CompanyProductionReportingAssignment.create(
          {
            assignment_id: assignmentId,
            company_id: assignment.company_id,
            company_structure_id: r.company_structure_id || null,
            user_id: r.user_id || null,
            role_id: r.role_id || null,
            notes: r.notes || null,
            created_by: userId,
            is_active: true,
          },
          { transaction: t }
        );
      }
    }
  });

  return await listReportingResponsibilities(assignmentId);
}

/**
 * List reporting responsibilities for an assignment.
 */
async function listReportingResponsibilities(assignmentId) {
  return await CompanyProductionReportingAssignment.findAll({
    where: { assignment_id: assignmentId, is_active: true },
    include: [
      { model: CompanyStructure, as: "department", attributes: ["company_structure_id", "name", "level"] },
      { model: User, as: "user", attributes: ["user_id", "full_name", "email"] },
      { model: Role, as: "role", attributes: ["role_id", "name"] },
    ],
    order: [["created_at", "ASC"]],
  });
}

/**
 * Submit a formal Target Amendment request for an approved target.
 */
async function submitTargetAmendment({
  assignmentId,
  proposedAnnualTarget,
  periodAllocations,
  amendmentReason,
  effectiveDate = null,
  submissionNotes = null,
  userId,
  companyScope = null,
}) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [
      { model: ProductionItem, as: "productionItem" },
      { model: CompanyLicense, as: "license" },
      { model: Company, as: "company" },
    ],
  });
  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }

  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot submit amendments for another company.");
    err.status = 403;
    throw err;
  }

  // Find currently approved target
  const approvedTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignmentId,
      status: "approved",
      target_period_type: "year",
    },
    order: [["version_number", "DESC"]],
  });

  if (!approvedTarget) {
    const err = new Error("Cannot request an amendment: No officially approved target exists for this assignment.");
    err.status = 400;
    throw err;
  }

  // Check if an amendment is already pending review
  const pendingAmendment = await CompanyProductionTargetAmendment.findOne({
    where: {
      assignment_id: assignmentId,
      status: ["amendment_submitted", "amendment_under_review"],
    },
  });
  if (pendingAmendment) {
    const err = new Error(
      `An amendment request (${pendingAmendment.amendment_reference}) is already under Federal review. Duplicate requests are not permitted.`
    );
    err.status = 400;
    throw err;
  }

  // Validate amendment reason
  if (!amendmentReason || !amendmentReason.trim()) {
    const err = new Error("A detailed reason for the target amendment is mandatory.");
    err.status = 400;
    throw err;
  }

  const numAnnual = Number(proposedAnnualTarget);
  if (isNaN(numAnnual) || numAnnual <= 0) {
    const err = new Error("Proposed annual target must be a positive number.");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(periodAllocations) || periodAllocations.length === 0) {
    const err = new Error("At least one period allocation must be provided.");
    err.status = 400;
    throw err;
  }

  // Validate sum of period allocations equals proposed annual target
  let totalPeriodSum = 0;
  for (const p of periodAllocations) {
    const pQty = Number(p.target_quantity);
    if (isNaN(pQty) || pQty < 0) {
      const err = new Error(`Invalid target quantity for period '${p.period_label}'.`);
      err.status = 400;
      throw err;
    }
    totalPeriodSum += pQty;

    // Validate department allocations if present
    if (Array.isArray(p.department_allocations) && p.department_allocations.length > 0) {
      let deptSum = 0;
      for (const d of p.department_allocations) {
        const dQty = Number(d.target_quantity);
        if (isNaN(dQty) || dQty < 0) {
          const err = new Error(`Invalid department target quantity in '${p.period_label}'.`);
          err.status = 400;
          throw err;
        }
        deptSum += dQty;
      }
      deptSum = roundDecimal(deptSum, 4);
      if (Math.abs(deptSum - roundDecimal(pQty, 4)) > 0.0001) {
        const err = new Error(
          `Department allocations total (${deptSum}) does not match period target '${p.period_label}' (${pQty}).`
        );
        err.status = 400;
        throw err;
      }
    }
  }

  totalPeriodSum = roundDecimal(totalPeriodSum, 4);
  const roundedAnnual = roundDecimal(numAnnual, 4);
  if (Math.abs(totalPeriodSum - roundedAnnual) > 0.0001) {
    const err = new Error(
      `Sum of proposed period allocations (${totalPeriodSum}) does not equal proposed annual target (${roundedAnnual}).`
    );
    err.status = 400;
    throw err;
  }

  // Generate unique sequential reference
  const count = await CompanyProductionTargetAmendment.count({ where: { assignment_id: assignmentId } });
  const year = new Date().getFullYear();
  const amendmentReference = `AMD-${year}-${String(count + 1).padStart(4, "0")}`;

  // Find max version number
  const maxVersion =
    (await CompanyProductionTarget.max("version_number", {
      where: { assignment_id: assignmentId },
    })) || approvedTarget.version_number;
  const proposedVersionNumber = maxVersion + 1;

  const unitId = assignment.default_reporting_unit_id;
  const factorToBase = await getUnitFactorToBase(assignment.production_item_id, unitId);
  const annualQuantityBase = roundDecimal(numAnnual * factorToBase, 4);

  const sortedStarts = [...periodAllocations].map((p) => p.period_start_date).sort();
  const sortedEnds = [...periodAllocations].map((p) => p.period_end_date).sort();
  const yearStart = sortedStarts[0] || assignment.effective_from;
  const yearEnd = sortedEnds[sortedEnds.length - 1] || assignment.effective_to || yearStart;
  const yearLabel = String(new Date(yearStart).getFullYear() || "Amended Target");

  let createdAmendment;

  await sequelize.transaction(async (t) => {
    // 1. Create amendment record
    createdAmendment = await CompanyProductionTargetAmendment.create(
      {
        assignment_id: assignmentId,
        amendment_reference: amendmentReference,
        current_approved_version: approvedTarget.version_number,
        proposed_version_number: proposedVersionNumber,
        current_annual_target: approvedTarget.target_quantity,
        proposed_annual_target: roundedAnnual,
        amendment_reason: amendmentReason.trim(),
        submission_notes: submissionNotes ? submissionNotes.trim() : null,
        effective_date: effectiveDate || null,
        status: "amendment_submitted",
        submitted_by: userId,
        submitted_at: new Date(),
      },
      { transaction: t }
    );

    // 2. Create root proposed target
    const rootProposedTarget = await CompanyProductionTarget.create(
      {
        assignment_id: assignmentId,
        parent_target_id: null,
        company_structure_id: null,
        version_number: proposedVersionNumber,
        target_period_type: "year",
        period_label: yearLabel,
        period_start_date: yearStart,
        period_end_date: yearEnd,
        target_quantity: roundedAnnual,
        unit_id: unitId,
        target_quantity_base: annualQuantityBase,
        status: "amendment_submitted",
        submission_notes: submissionNotes,
        submitted_by: userId,
        submitted_at: new Date(),
        created_by: userId,
        amendment_id: createdAmendment.amendment_id,
        is_amendment: true,
      },
      { transaction: t }
    );

    // 3. Create period targets and department allocations
    for (const p of periodAllocations) {
      const pQty = Number(p.target_quantity);
      const pQtyBase = roundDecimal(pQty * factorToBase, 4);

      const periodRecord = await CompanyProductionTarget.create(
        {
          assignment_id: assignmentId,
          parent_target_id: rootProposedTarget.target_id,
          company_structure_id: null,
          version_number: proposedVersionNumber,
          target_period_type: p.target_period_type || assignment.target_allocation_depth || "quarter",
          period_label: p.period_label,
          period_start_date: p.period_start_date,
          period_end_date: p.period_end_date,
          target_quantity: pQty,
          unit_id: unitId,
          target_quantity_base: pQtyBase,
          status: "amendment_submitted",
          submitted_by: userId,
          submitted_at: new Date(),
          created_by: userId,
          amendment_id: createdAmendment.amendment_id,
          is_amendment: true,
        },
        { transaction: t }
      );

      if (Array.isArray(p.department_allocations)) {
        for (const d of p.department_allocations) {
          const dQty = Number(d.target_quantity);
          if (isNaN(dQty) || dQty <= 0) continue;
          const dQtyBase = roundDecimal(dQty * factorToBase, 4);

          await CompanyProductionTarget.create(
            {
              assignment_id: assignmentId,
              parent_target_id: periodRecord.target_id,
              company_structure_id: d.company_structure_id,
              version_number: proposedVersionNumber,
              target_period_type: p.target_period_type || assignment.target_allocation_depth || "quarter",
              period_label: `${p.period_label} - Dept`,
              period_start_date: p.period_start_date,
              period_end_date: p.period_end_date,
              target_quantity: dQty,
              unit_id: unitId,
              target_quantity_base: dQtyBase,
              status: "amendment_submitted",
              submitted_by: userId,
              submitted_at: new Date(),
              created_by: userId,
              amendment_id: createdAmendment.amendment_id,
              is_amendment: true,
            },
            { transaction: t }
          );
        }
      }
    }

    // 4. Record history
    await CompanyProductionTargetApprovalHistory.create(
      {
        assignment_id: assignmentId,
        version_number: proposedVersionNumber,
        amendment_id: createdAmendment.amendment_id,
        action: "amendment_submitted",
        previous_status: "approved",
        new_status: "amendment_submitted",
        comments: `Amendment requested: ${amendmentReason.trim()}`,
        actor_id: userId,
      },
      { transaction: t }
    );
  });

  return await getAmendmentComparison({ amendmentId: createdAmendment.amendment_id });
}

/**
 * Get side-by-side comparison between approved target and proposed amendment target.
 */
async function getAmendmentComparison({ assignmentId, amendmentId = null }) {
  let amendment;
  if (amendmentId) {
    amendment = await CompanyProductionTargetAmendment.findByPk(amendmentId, {
      include: [
        { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
        { model: User, as: "reviewer", attributes: ["user_id", "full_name", "email"] },
        {
          model: CompanyProductionAssignment,
          as: "assignment",
          include: [
            { model: Company, as: "company" },
            { model: CompanyLicense, as: "license" },
            { model: ProductionItem, as: "productionItem" },
            { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
          ],
        },
      ],
    });
  } else if (assignmentId) {
    amendment = await CompanyProductionTargetAmendment.findOne({
      where: { assignment_id: assignmentId },
      order: [["created_at", "DESC"]],
      include: [
        { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
        { model: User, as: "reviewer", attributes: ["user_id", "full_name", "email"] },
        {
          model: CompanyProductionAssignment,
          as: "assignment",
          include: [
            { model: Company, as: "company" },
            { model: CompanyLicense, as: "license" },
            { model: ProductionItem, as: "productionItem" },
            { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
          ],
        },
      ],
    });
  }

  if (!amendment) {
    const err = new Error("Target amendment request not found.");
    err.status = 404;
    throw err;
  }

  const effectiveAssignmentId = amendment.assignment_id;

  // Fetch approved target proposal tree
  const approvedProposal = await getTargetProposal(effectiveAssignmentId, amendment.current_approved_version);

  // Fetch proposed amendment target tree
  const proposedProposal = await getTargetProposal(effectiveAssignmentId, amendment.proposed_version_number);

  const approvedAnnual = approvedProposal ? Number(approvedProposal.annual_target) : Number(amendment.current_annual_target);
  const proposedAnnual = proposedProposal ? Number(proposedProposal.annual_target) : Number(amendment.proposed_annual_target);
  const annualDifference = roundDecimal(proposedAnnual - approvedAnnual, 4);
  const annualPercentageChange =
    approvedAnnual > 0 ? roundDecimal(((proposedAnnual - approvedAnnual) / approvedAnnual) * 100, 2) : 0;

  // Map period comparisons
  const approvedPeriods = approvedProposal?.periods || [];
  const proposedPeriods = proposedProposal?.periods || [];

  const periodMap = new Map();
  for (const ap of approvedPeriods) {
    periodMap.set(ap.period_label, {
      period_label: ap.period_label,
      period_start_date: ap.period_start_date,
      period_end_date: ap.period_end_date,
      approved_quantity: Number(ap.target_quantity),
      proposed_quantity: 0,
      approved_departments: ap.department_allocations || [],
      proposed_departments: [],
    });
  }

  for (const pp of proposedPeriods) {
    if (periodMap.has(pp.period_label)) {
      const item = periodMap.get(pp.period_label);
      item.proposed_quantity = Number(pp.target_quantity);
      item.proposed_departments = pp.department_allocations || [];
    } else {
      periodMap.set(pp.period_label, {
        period_label: pp.period_label,
        period_start_date: pp.period_start_date,
        period_end_date: pp.period_end_date,
        approved_quantity: 0,
        proposed_quantity: Number(pp.target_quantity),
        approved_departments: [],
        proposed_departments: pp.department_allocations || [],
      });
    }
  }

  const periodComparisons = Array.from(periodMap.values()).map((p) => {
    const diff = roundDecimal(p.proposed_quantity - p.approved_quantity, 4);
    const pct =
      p.approved_quantity > 0 ? roundDecimal(((p.proposed_quantity - p.approved_quantity) / p.approved_quantity) * 100, 2) : 0;

    // Compare department allocations
    const deptMap = new Map();
    for (const ad of p.approved_departments) {
      const key = ad.company_structure_id || ad.period_label;
      deptMap.set(key, {
        department_id: ad.company_structure_id,
        department_name: ad.department?.name || "Department",
        approved_quantity: Number(ad.target_quantity),
        proposed_quantity: 0,
      });
    }
    for (const pd of p.proposed_departments) {
      const key = pd.company_structure_id || pd.period_label;
      if (deptMap.has(key)) {
        deptMap.get(key).proposed_quantity = Number(pd.target_quantity);
      } else {
        deptMap.set(key, {
          department_id: pd.company_structure_id,
          department_name: pd.department?.name || "Department",
          approved_quantity: 0,
          proposed_quantity: Number(pd.target_quantity),
        });
      }
    }

    const departmentComparisons = Array.from(deptMap.values()).map((d) => ({
      ...d,
      difference: roundDecimal(d.proposed_quantity - d.approved_quantity, 4),
      percentage_change:
        d.approved_quantity > 0 ? roundDecimal(((d.proposed_quantity - d.approved_quantity) / d.approved_quantity) * 100, 2) : 0,
    }));

    return {
      period_label: p.period_label,
      period_start_date: p.period_start_date,
      period_end_date: p.period_end_date,
      approved_quantity: p.approved_quantity,
      proposed_quantity: p.proposed_quantity,
      difference: diff,
      percentage_change: pct,
      department_comparisons: departmentComparisons,
    };
  });

  return {
    amendment,
    assignment: amendment.assignment,
    approvedProposal,
    proposedProposal,
    annualComparison: {
      approved_annual: approvedAnnual,
      proposed_annual: proposedAnnual,
      difference: annualDifference,
      percentage_change: annualPercentageChange,
    },
    periodComparisons,
  };
}

/**
 * Review target amendment (Federal/Private authority only).
 */
async function reviewTargetAmendment({ amendmentId, decision, reviewComments, effectiveDate, userId }) {
  const validDecisions = ["amendment_approved", "amendment_rejected", "amendment_revision_requested"];
  if (!validDecisions.includes(decision)) {
    const err = new Error(`Invalid amendment decision '${decision}'. Must be one of: ${validDecisions.join(", ")}`);
    err.status = 400;
    throw err;
  }

  if (
    (decision === "amendment_rejected" || decision === "amendment_revision_requested") &&
    (!reviewComments || !reviewComments.trim())
  ) {
    const err = new Error(
      "A detailed review comment/reason is mandatory when rejecting or requesting revisions on an amendment."
    );
    err.status = 400;
    throw err;
  }

  const amendment = await CompanyProductionTargetAmendment.findByPk(amendmentId);
  if (!amendment) {
    const err = new Error("Amendment not found.");
    err.status = 404;
    throw err;
  }

  const assignmentId = amendment.assignment_id;
  const proposedVersion = amendment.proposed_version_number;
  const previousApprovedVersion = amendment.current_approved_version;

  await sequelize.transaction(async (t) => {
    if (decision === "amendment_approved") {
      // 1. Mark previous approved targets as superseded
      await CompanyProductionTarget.update(
        { status: "superseded" },
        {
          where: {
            assignment_id: assignmentId,
            version_number: previousApprovedVersion,
          },
          transaction: t,
        }
      );

      // 2. Mark proposed targets as approved
      await CompanyProductionTarget.update(
        {
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_comments: reviewComments || "Approved by Federal Authority.",
        },
        {
          where: {
            assignment_id: assignmentId,
            version_number: proposedVersion,
          },
          transaction: t,
        }
      );

      // 3. Mark amendment as approved
      await amendment.update(
        {
          status: "amendment_approved",
          reviewed_by: userId,
          reviewed_at: new Date(),
          activated_at: new Date(),
          effective_date: effectiveDate || amendment.effective_date || new Date().toISOString().slice(0, 10),
          review_comments: reviewComments || null,
        },
        { transaction: t }
      );

      // 4. Approval history
      await CompanyProductionTargetApprovalHistory.create(
        {
          assignment_id: assignmentId,
          version_number: proposedVersion,
          amendment_id: amendment.amendment_id,
          action: "amendment_approved",
          previous_status: "amendment_submitted",
          new_status: "approved",
          comments: reviewComments || "Target amendment approved and activated by Federal Ministry.",
          actor_id: userId,
        },
        { transaction: t }
      );
    } else if (decision === "amendment_rejected") {
      // Update targets to amendment_rejected
      await CompanyProductionTarget.update(
        {
          status: "amendment_rejected",
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_comments: reviewComments.trim(),
        },
        {
          where: {
            assignment_id: assignmentId,
            version_number: proposedVersion,
          },
          transaction: t,
        }
      );

      // Update amendment record
      await amendment.update(
        {
          status: "amendment_rejected",
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_comments: reviewComments.trim(),
        },
        { transaction: t }
      );

      // Approval history
      await CompanyProductionTargetApprovalHistory.create(
        {
          assignment_id: assignmentId,
          version_number: proposedVersion,
          amendment_id: amendment.amendment_id,
          action: "amendment_rejected",
          previous_status: "amendment_submitted",
          new_status: "amendment_rejected",
          comments: `Amendment rejected: ${reviewComments.trim()}`,
          actor_id: userId,
        },
        { transaction: t }
      );
    } else if (decision === "amendment_revision_requested") {
      // Update targets to amendment_revision_requested
      await CompanyProductionTarget.update(
        {
          status: "amendment_revision_requested",
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_comments: reviewComments.trim(),
        },
        {
          where: {
            assignment_id: assignmentId,
            version_number: proposedVersion,
          },
          transaction: t,
        }
      );

      // Update amendment record
      await amendment.update(
        {
          status: "amendment_revision_requested",
          reviewed_by: userId,
          reviewed_at: new Date(),
          review_comments: reviewComments.trim(),
        },
        { transaction: t }
      );

      // Approval history
      await CompanyProductionTargetApprovalHistory.create(
        {
          assignment_id: assignmentId,
          version_number: proposedVersion,
          amendment_id: amendment.amendment_id,
          action: "amendment_revision_requested",
          previous_status: "amendment_submitted",
          new_status: "amendment_revision_requested",
          comments: `Revision requested: ${reviewComments.trim()}`,
          actor_id: userId,
        },
        { transaction: t }
      );
    }
  });

  return await getAmendmentComparison({ amendmentId });
}

/**
 * Revise and resubmit a target amendment when revision is requested.
 */
async function reviseTargetAmendment({
  amendmentId,
  proposedAnnualTarget,
  periodAllocations,
  amendmentReason,
  effectiveDate = null,
  submissionNotes = null,
  userId,
  companyScope = null,
}) {
  const amendment = await CompanyProductionTargetAmendment.findByPk(amendmentId, {
    include: [{ model: CompanyProductionAssignment, as: "assignment" }],
  });
  if (!amendment) {
    const err = new Error("Amendment not found.");
    err.status = 404;
    throw err;
  }

  if (companyScope && amendment.assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot modify amendments for another company.");
    err.status = 403;
    throw err;
  }

  if (amendment.status !== "amendment_revision_requested" && amendment.status !== "amendment_draft") {
    const err = new Error(`Cannot revise amendment with status '${amendment.status}'.`);
    err.status = 400;
    throw err;
  }

  const numAnnual = Number(proposedAnnualTarget);
  if (isNaN(numAnnual) || numAnnual <= 0) {
    const err = new Error("Proposed annual target must be a positive number.");
    err.status = 400;
    throw err;
  }

  // Validate period allocations
  let totalPeriodSum = 0;
  for (const p of periodAllocations) {
    const pQty = Number(p.target_quantity);
    if (isNaN(pQty) || pQty < 0) {
      const err = new Error(`Invalid target quantity for period '${p.period_label}'.`);
      err.status = 400;
      throw err;
    }
    totalPeriodSum += pQty;
  }
  totalPeriodSum = roundDecimal(totalPeriodSum, 4);
  const roundedAnnual = roundDecimal(numAnnual, 4);
  if (Math.abs(totalPeriodSum - roundedAnnual) > 0.0001) {
    const err = new Error(
      `Sum of proposed period allocations (${totalPeriodSum}) does not equal proposed annual target (${roundedAnnual}).`
    );
    err.status = 400;
    throw err;
  }

  const assignment = amendment.assignment;
  const unitId = assignment.default_reporting_unit_id;
  const factorToBase = await getUnitFactorToBase(assignment.production_item_id, unitId);
  const annualQuantityBase = roundDecimal(numAnnual * factorToBase, 4);
  const proposedVersionNumber = amendment.proposed_version_number;

  await sequelize.transaction(async (t) => {
    // Delete existing proposed targets for this amendment
    await CompanyProductionTarget.destroy({
      where: { amendment_id: amendment.amendment_id },
      transaction: t,
      force: true,
    });

    // Update amendment record
    await amendment.update(
      {
        proposed_annual_target: roundedAnnual,
        amendment_reason: amendmentReason ? amendmentReason.trim() : amendment.amendment_reason,
        submission_notes: submissionNotes ? submissionNotes.trim() : amendment.submission_notes,
        effective_date: effectiveDate || amendment.effective_date,
        status: "amendment_submitted",
        submitted_by: userId,
        submitted_at: new Date(),
      },
      { transaction: t }
    );

    const sortedStarts = [...periodAllocations].map((p) => p.period_start_date).sort();
    const sortedEnds = [...periodAllocations].map((p) => p.period_end_date).sort();
    const yearStart = sortedStarts[0] || assignment.effective_from;
    const yearEnd = sortedEnds[sortedEnds.length - 1] || assignment.effective_to || yearStart;
    const yearLabel = String(new Date(yearStart).getFullYear() || "Amended Target");

    // Recreate root proposed target
    const rootProposedTarget = await CompanyProductionTarget.create(
      {
        assignment_id: assignment.assignment_id,
        parent_target_id: null,
        company_structure_id: null,
        version_number: proposedVersionNumber,
        target_period_type: "year",
        period_label: yearLabel,
        period_start_date: yearStart,
        period_end_date: yearEnd,
        target_quantity: roundedAnnual,
        unit_id: unitId,
        target_quantity_base: annualQuantityBase,
        status: "amendment_submitted",
        submission_notes: submissionNotes,
        submitted_by: userId,
        submitted_at: new Date(),
        created_by: userId,
        amendment_id: amendment.amendment_id,
        is_amendment: true,
      },
      { transaction: t }
    );

    // Recreate periods and department allocations
    for (const p of periodAllocations) {
      const pQty = Number(p.target_quantity);
      const pQtyBase = roundDecimal(pQty * factorToBase, 4);

      const periodRecord = await CompanyProductionTarget.create(
        {
          assignment_id: assignment.assignment_id,
          parent_target_id: rootProposedTarget.target_id,
          company_structure_id: null,
          version_number: proposedVersionNumber,
          target_period_type: p.target_period_type || assignment.target_allocation_depth || "quarter",
          period_label: p.period_label,
          period_start_date: p.period_start_date,
          period_end_date: p.period_end_date,
          target_quantity: pQty,
          unit_id: unitId,
          target_quantity_base: pQtyBase,
          status: "amendment_submitted",
          submitted_by: userId,
          submitted_at: new Date(),
          created_by: userId,
          amendment_id: amendment.amendment_id,
          is_amendment: true,
        },
        { transaction: t }
      );

      if (Array.isArray(p.department_allocations)) {
        for (const d of p.department_allocations) {
          const dQty = Number(d.target_quantity);
          if (isNaN(dQty) || dQty <= 0) continue;
          const dQtyBase = roundDecimal(dQty * factorToBase, 4);

          await CompanyProductionTarget.create(
            {
              assignment_id: assignment.assignment_id,
              parent_target_id: periodRecord.target_id,
              company_structure_id: d.company_structure_id,
              version_number: proposedVersionNumber,
              target_period_type: p.target_period_type || assignment.target_allocation_depth || "quarter",
              period_label: `${p.period_label} - Dept`,
              period_start_date: p.period_start_date,
              period_end_date: p.period_end_date,
              target_quantity: dQty,
              unit_id: unitId,
              target_quantity_base: dQtyBase,
              status: "amendment_submitted",
              submitted_by: userId,
              submitted_at: new Date(),
              created_by: userId,
              amendment_id: amendment.amendment_id,
              is_amendment: true,
            },
            { transaction: t }
          );
        }
      }
    }

    // Record history
    await CompanyProductionTargetApprovalHistory.create(
      {
        assignment_id: assignment.assignment_id,
        version_number: proposedVersionNumber,
        amendment_id: amendment.amendment_id,
        action: "amendment_resubmitted",
        previous_status: "amendment_revision_requested",
        new_status: "amendment_submitted",
        comments: `Revised amendment resubmitted: ${amendmentReason || "Adjusted proposed values."}`,
        actor_id: userId,
      },
      { transaction: t }
    );
  });

  return await getAmendmentComparison({ amendmentId: amendment.amendment_id });
}

/**
 * List all target amendments with filtering.
 */
async function listTargetAmendments(filters = {}) {
  const where = {};
  if (filters.assignment_id) {
    where.assignment_id = filters.assignment_id;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  const assignmentWhere = {};
  if (filters.company_id) {
    assignmentWhere.company_id = filters.company_id;
  }

  return await CompanyProductionTargetAmendment.findAll({
    where,
    include: [
      {
        model: CompanyProductionAssignment,
        as: "assignment",
        where: Object.keys(assignmentWhere).length > 0 ? assignmentWhere : undefined,
        include: [
          { model: Company, as: "company" },
          { model: CompanyLicense, as: "license" },
          { model: ProductionItem, as: "productionItem" },
          { model: GoldMeasurementUnit, as: "defaultReportingUnit" },
        ],
      },
      { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
      { model: User, as: "reviewer", attributes: ["user_id", "full_name", "email"] },
    ],
    order: [["created_at", "DESC"]],
  });
}

/**
 * Get comprehensive production detail for an assignment.
 */
async function getProductionDetail(assignmentId, companyScope = null) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId, {
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["company_id", "name", "code"],
      },
      {
        model: CompanyLicense,
        as: "license",
        include: [{ model: LicenseType, as: "licenseType" }],
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
    ],
  });

  if (!assignment) {
    const err = new Error("Company production assignment not found.");
    err.status = 404;
    throw err;
  }

  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot access an assignment belonging to another company.");
    err.status = 403;
    throw err;
  }

  // Fetch active approved target
  const approvedTarget = await CompanyProductionTarget.findOne({
    where: {
      assignment_id: assignmentId,
      status: "approved",
      target_period_type: "year",
    },
    order: [["version_number", "DESC"]],
  });

  // Fetch latest target proposal (any status)
  const latestTarget = await CompanyProductionTarget.findOne({
    where: { assignment_id: assignmentId, target_period_type: "year" },
    order: [["version_number", "DESC"]],
  });

  const activeTargetVersion = approvedTarget ? approvedTarget.version_number : null;
  const proposalVersion = latestTarget ? latestTarget.version_number : null;

  // Fetch full proposal tree if exists
  const targetProposal = proposalVersion ? await getTargetProposal(assignmentId, proposalVersion) : null;
  const approvedTargetsTree = activeTargetVersion ? await getTargetProposal(assignmentId, activeTargetVersion) : null;

  // Fetch approval history
  const approvalHistory = await getApprovalHistory(assignmentId);

  // Fetch responsibilities
  const responsibilities = await listReportingResponsibilities(assignmentId);

  // Check license validity
  const license = assignment.license;
  let licenseEligible = true;
  let licenseIneligibilityReason = null;

  if (license && (license.status === "suspended" || license.status === "terminated")) {
    licenseEligible = false;
    licenseIneligibilityReason = `License '${license.license_number}' is ${license.status}. Production reporting is not permitted.`;
  }

  // Once target allocation is approved, reporting is unlocked for the company
  const isReportingUnlocked = Boolean(approvedTarget && licenseEligible);

  // Recent reports
  const recentReports = await CompanyProductionReport.findAll({
    where: { assignment_id: assignmentId },
    include: [
      { model: GoldMeasurementUnit, as: "reportedUnit" },
      { model: CompanyStructure, as: "department", attributes: ["name", "level"] },
      { model: User, as: "submitter", attributes: ["full_name", "email"] },
    ],
    order: [["report_date", "DESC"]],
    limit: 20,
  });

  // Fetch all amendments for this assignment
  const allAmendments = await CompanyProductionTargetAmendment.findAll({
    where: { assignment_id: assignmentId },
    include: [
      { model: User, as: "submitter", attributes: ["user_id", "full_name", "email"] },
      { model: User, as: "reviewer", attributes: ["user_id", "full_name", "email"] },
    ],
    order: [["created_at", "DESC"]],
  });

  const pendingAmendment =
    allAmendments.find((a) =>
      ["amendment_submitted", "amendment_under_review", "amendment_revision_requested"].includes(a.status)
    ) || null;

  const latestAmendment = allAmendments[0] || null;
  let amendmentComparison = null;
  if (latestAmendment) {
    try {
      amendmentComparison = await getAmendmentComparison({ amendmentId: latestAmendment.amendment_id });
    } catch (e) {
      // Comparison optional if target data not present
    }
  }

  return {
    assignment,
    approvedTarget,
    latestTarget,
    targetProposal,
    approvedTargetsTree,
    approvalHistory,
    responsibilities,
    licenseEligible,
    licenseIneligibilityReason,
    isReportingUnlocked,
    recentReports,
    allAmendments,
    pendingAmendment,
    latestAmendment,
    amendmentComparison,
  };
}

/**
 * Get target-aligned reporting hierarchy for an assignment.
 */
async function getReportingHierarchy({ assignmentId, year, companyScope = null }) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found.");
    err.status = 404;
    throw err;
  }
  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot access reporting hierarchy for another company.");
    err.status = 403;
    throw err;
  }
  return await buildTargetAlignedReportingHierarchy({ assignmentId, year });
}

/**
 * Get daily reporting calendar matrix for a specific month.
 */
async function getDailyReportingMatrix({ assignmentId, month, companyScope = null }) {
  const assignment = await CompanyProductionAssignment.findByPk(assignmentId);
  if (!assignment) {
    const err = new Error("Assignment not found.");
    err.status = 404;
    throw err;
  }
  if (companyScope && assignment.company_id !== companyScope) {
    const err = new Error("Forbidden: You cannot access reporting matrix for another company.");
    err.status = 403;
    throw err;
  }
  return await buildDailyReportingMatrix({ assignmentId, monthStr: month });
}

module.exports = {
  listAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  saveTargetHierarchy,
  getTargetsByAssignment,
  saveTargetProposal,
  submitTargetProposal,
  reviewTargetProposal,
  getTargetProposal,
  getApprovalHistory,
  manageReportingResponsibilities,
  listReportingResponsibilities,
  getProductionDetail,
  submitReport,
  getReportById,
  updateReport,
  reviewReport,
  listReports,
  calculateProductionPerformance,
  getFederalDashboard,
  getCompanyDashboard,
  submitTargetAmendment,
  getAmendmentComparison,
  reviewTargetAmendment,
  reviseTargetAmendment,
  listTargetAmendments,
  getReportingHierarchy,
  getDailyReportingMatrix,
};
