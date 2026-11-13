"use strict";

const { Op } = require("sequelize");
const crypto = require("crypto");
const db = require("../models");
const {
  areUnitsCompatible,
  getConversionFactor,
  convertValue,
  getUnitCategory,
} = require("../utils/nationalUnitCompatibilityUtils");
const {
  calculateAnnualEndDate,
  validateAnnualDateRange,
  generateReportingPeriods,
  computePeriodLockStatus,
} = require("../utils/nationalReportingPeriodUtils");

const {
  NationalReportingRequirement,
  NationalReportingAssignment,
  RegionalRequirementMapping,
  NationalPublishedRecord,
  RegionalPlanNode,
  RegionalPlanVersion,
  RegionalPlanningConfiguration,
  Region,
  User,
} = db;

/**
 * Resolve human/canonical unit for a regional plan node, checking RegionalPlanningConfiguration target_units
 */
async function resolvePlanNodeUnit(planNode, regionId) {
  if (!planNode || !planNode.target_unit) return "count";
  const rawUnit = String(planNode.target_unit).trim();
  if (!rawUnit) return "count";

  // If already matches a known standard unit
  const cat = getUnitCategory(rawUnit);
  if (cat !== "custom") {
    return rawUnit;
  }

  // Look up RegionalPlanningConfiguration for the region
  try {
    const config = await RegionalPlanningConfiguration.findOne({
      where: {
        region_id: regionId || planNode.region_id,
      },
      order: [["created_at", "DESC"]],
    });

    if (config && Array.isArray(config.target_units)) {
      for (const item of config.target_units) {
        if (typeof item === "string") {
          if (item.toLowerCase() === rawUnit.toLowerCase()) {
            return item;
          }
        } else if (item && typeof item === "object") {
          if (
            (item.id && String(item.id).toLowerCase() === rawUnit.toLowerCase()) ||
            (item.label && String(item.label).toLowerCase() === rawUnit.toLowerCase()) ||
            (item.symbol && String(item.symbol).toLowerCase() === rawUnit.toLowerCase())
          ) {
            return item.label || item.symbol || item.id;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error resolving regional plan node unit:", err);
  }

  return rawUnit;
}

const GREGORIAN_MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

/**
 * Robustly resolve monthly / period target from period_targets mapping
 */
function resolveMonthlyTarget(periodTargets, periodLabel, periodIndex, periodStartDate) {
  if (!periodTargets || typeof periodTargets !== "object") return null;
  const labelClean = String(periodLabel || "").trim().toLowerCase();

  // 1. Direct label match (case-insensitive)
  for (const [k, v] of Object.entries(periodTargets)) {
    if (k.trim().toLowerCase() === labelClean) {
      const num = Number(v);
      return !isNaN(num) ? num : null;
    }
  }

  // 2. Month name from start_date
  if (periodStartDate) {
    const d = new Date(periodStartDate);
    if (!isNaN(d.getTime())) {
      const monthName = d.toLocaleString("en-US", { month: "long" }).toLowerCase();
      for (const [k, v] of Object.entries(periodTargets)) {
        if (k.trim().toLowerCase() === monthName) {
          const num = Number(v);
          return !isNaN(num) ? num : null;
        }
      }
    }
  }

  // 3. Month index match ("Month 1" -> 1st month, or key "1")
  if (periodIndex !== undefined && periodIndex !== null) {
    if (periodTargets[String(periodIndex)] !== undefined) {
      const num = Number(periodTargets[String(periodIndex)]);
      return !isNaN(num) ? num : null;
    }
    if (periodTargets[`Month ${periodIndex}`] !== undefined) {
      const num = Number(periodTargets[`Month ${periodIndex}`]);
      return !isNaN(num) ? num : null;
    }
    if (periodTargets[`Division ${periodIndex}`] !== undefined) {
      const num = Number(periodTargets[`Division ${periodIndex}`]);
      return !isNaN(num) ? num : null;
    }

    if (periodIndex >= 1 && periodIndex <= 12) {
      const mName = GREGORIAN_MONTH_NAMES[periodIndex - 1];
      for (const [k, v] of Object.entries(periodTargets)) {
        if (k.trim().toLowerCase() === mName) {
          const num = Number(v);
          return !isNaN(num) ? num : null;
        }
      }
    }
  }

  // 4. Try parsing "Month X" or "Division X" from periodLabel if index was not provided
  const matchMonth = labelClean.match(/(?:month|division)\s*(\d+)/i);
  if (matchMonth) {
    const parsedIdx = parseInt(matchMonth[1], 10);
    if (periodTargets[`Division ${parsedIdx}`] !== undefined) {
      const num = Number(periodTargets[`Division ${parsedIdx}`]);
      return !isNaN(num) ? num : null;
    }
    if (periodTargets[`Month ${parsedIdx}`] !== undefined) {
      const num = Number(periodTargets[`Month ${parsedIdx}`]);
      return !isNaN(num) ? num : null;
    }
    if (periodTargets[String(parsedIdx)] !== undefined) {
      const num = Number(periodTargets[String(parsedIdx)]);
      return !isNaN(num) ? num : null;
    }
    if (parsedIdx >= 1 && parsedIdx <= 12) {
      const mName = GREGORIAN_MONTH_NAMES[parsedIdx - 1];
      for (const [k, v] of Object.entries(periodTargets)) {
        if (k.trim().toLowerCase() === mName) {
          const num = Number(v);
          return !isNaN(num) ? num : null;
        }
      }
    }
  }

  return null;
}

/**
 * Check if Form-Based National Reporting is currently effective for a Region.
 * Form-based reporting is the default method unless explicitly switched to node_mapping.
 */
function isRegionFormReportingEffective(region) {
  if (!region) return true;
  const method =
    region.national_reporting_method ||
    (region.form_reporting_active ? "form_based" : "node_mapping") ||
    "form_based";

  if (method === "node_mapping") return false;

  const todayStr = new Date().toISOString().slice(0, 10);
  if (region.form_reporting_start_date && String(region.form_reporting_start_date) > todayStr) {
    return false;
  }
  if (region.form_reporting_end_date && String(region.form_reporting_end_date) < todayStr) {
    return false;
  }
  return true;
}

/**
 * Send system-wide notifications upon national report submission
 */
async function notifyNationalReportSubmission({
  publishedRecord,
  requirement,
  region,
  reportingPeriodLabel,
  reportingYear,
  numActual,
  numTarget,
  expectedUnit,
  achievementPercent,
  publicationReference,
  userId,
}) {
  try {
    const { sendNotification } = require("../utils/notification");
    const { User, Role } = db;

    // 1. Find internal federal administrators / national reporting officers to notify
    const federalUsers = await User.findAll({
      where: {
        is_active: true,
        region_id: null,
        company_id: null,
        purchasing_center_id: null,
      },
      attributes: ["user_id", "email", "full_name"],
    });

    const overAchievedText =
      achievementPercent && achievementPercent > 100
        ? ` (+${(achievementPercent - 100).toFixed(1)}% over-achievement)`
        : "";

    const federalPayload = {
      title: `National Report Received: ${region.name}`,
      message: `${region.name} submitted official report for '${requirement.title}' (${reportingYear} ${reportingPeriodLabel}) with achievement ${numActual != null ? numActual : "—"} ${expectedUnit} (${achievementPercent || 0}%${overAchievedText}).`,
      category: "assignments",
      notification_type: "report_received",
      link_path: "/national-reporting?tab=published",
      priority: "normal",
      metadata: {
        published_record_id: publishedRecord.published_record_id,
        requirement_id: requirement.requirement_id,
        region_id: region.region_id,
        revision_number: publishedRecord.revision_number,
        publication_reference: publicationReference,
      },
    };

    if (federalUsers.length > 0) {
      await sendNotification(federalUsers, federalPayload);
    }

    // 2. Notify the regional submitter confirming successful receipt
    if (userId) {
      const submitterPayload = {
        title: "National Report Published Successfully",
        message: `Your report for '${requirement.title}' (${reportingYear} ${reportingPeriodLabel}) was officially registered (Ref: ${publicationReference}, Rev #${publishedRecord.revision_number}).`,
        category: "assignments",
        notification_type: "report_published",
        link_path: `/regions/${region.region_id}/national-reporting?tab=history`,
        priority: "normal",
        metadata: {
          published_record_id: publishedRecord.published_record_id,
          publication_reference: publicationReference,
          revision_number: publishedRecord.revision_number,
        },
      };
      await sendNotification([{ user_id: userId }], submitterPayload);
    }
  } catch (notifErr) {
    console.error("[NationalReporting] Failed to dispatch notifications:", notifErr.message);
  }
}

/**
 * Regional National Reporting Service
 * Manages regional mapping, period confirmation, and the strict publication gateway
 */
class RegionalNationalReportingService {
  /**
   * List all assigned national requirements for a specific region with current status
   */
  async listAssignedRequirementsForRegion(regionId, filters = {}) {
    const assignments = await NationalReportingAssignment.findAll({
      where: {
        region_id: regionId,
        status: "active",
      },
      include: [
        {
          model: NationalReportingRequirement,
          as: "requirement",
          where: { is_active: true },
        },
        {
          model: RegionalRequirementMapping,
          as: "mappings",
          where: { region_id: regionId },
          required: false,
          include: [
            {
              model: RegionalPlanNode,
              as: "planNode",
              attributes: [
                "regional_plan_node_id",
                "title",
                "target_unit",
                "period_target",
                "period_actual",
                "period_actual_status",
                "annual_target",
                "annual_actual",
                "annual_actual_status",
                "narration",
              ],
            },
            {
              model: RegionalPlanVersion,
              as: "planVersion",
              attributes: ["regional_plan_version_id", "draft_name", "version_kind", "planning_year"],
            },
            {
              model: RegionalPlanVersion,
              as: "confirmedPeriodVersion",
              attributes: ["regional_plan_version_id", "draft_name", "period_label", "planning_year", "sequence_index"],
            },
          ],
        },
        {
          model: NationalPublishedRecord,
          as: "publishedRecords",
          where: { region_id: regionId },
          required: false,
          order: [["published_at", "DESC"]],
        },
      ],
      order: [["assigned_at", "DESC"]],
    });

    const regionObj = await Region.findByPk(regionId, {
      attributes: [
        "region_id",
        "form_reporting_active",
        "form_reporting_start_date",
        "form_reporting_end_date",
      ],
    });
    const isFormEffective = isRegionFormReportingEffective(regionObj);

    return assignments.map((assignment) => {
      const item = assignment.toJSON();
      const activeMapping =
        item.mappings && item.mappings.length > 0
          ? item.mappings.find((m) => m.stage === "confirmed") || item.mappings[0]
          : null;

      let workflowStatus = "unmapped";
      let isValidated = false;

      if (activeMapping) {
        if (activeMapping.stage === "confirmed") {
          workflowStatus = "confirmed";
          if (activeMapping.planNode) {
            const nodeStatus = activeMapping.planNode.period_actual_status;
            if (nodeStatus === "validated") {
              isValidated = true;
              workflowStatus = "ready_to_publish";
            }
          }
        } else {
          workflowStatus = "potential";
        }
      }

      // 1. Generate applicable recurring periods for this requirement and annual date range
      const req = item.requirement || {};
      const startDate =
        item.effective_start_date ||
        req.effective_start_date ||
        `${new Date().getFullYear()}-07-01`;
      const endDate =
        item.effective_end_date ||
        req.effective_end_date ||
        calculateAnnualEndDate(startDate);
      const frequency = item.frequency_override || req.frequency || "quarterly";

      const generatedPeriods = generateReportingPeriods(startDate, endDate, frequency);

      // 2. Map period-specific submission records
      const publishedRecords = item.publishedRecords || [];
      const lockOverrides = item.lock_overrides || {};
      const deadlineDays =
        item.submission_deadline_days ||
        req.submission_deadline_days ||
        req.validation_rules?.submission_deadline_days ||
        15;

      const recurringPeriods = generatedPeriods.map((p) => {
        const periodObj = { ...p };
        const matchingRecord = publishedRecords.find(
          (pub) =>
            String(pub.reporting_period_label).trim().toLowerCase() ===
              periodObj.period_label.trim().toLowerCase() &&
            ["published", "clarification_requested"].includes(pub.status)
        );

        const activeOverride =
          lockOverrides[p.period_label] ||
          lockOverrides[String(p.period_label).toUpperCase()] ||
          (p.division_label ? lockOverrides[p.division_label] : null) ||
          null;

        const periodLock = computePeriodLockStatus({
          period: p,
          lockOverride: activeOverride,
          deadlineDays,
        });

        periodObj.is_locked = periodLock.is_locked;
        periodObj.lock_state = periodLock.lock_state;
        periodObj.lock_reason = periodLock.lock_reason;
        periodObj.deadline_date = periodLock.deadline_date;
        periodObj.is_manually_unlocked = periodLock.is_manually_unlocked;
        periodObj.lock_override = periodLock.lock_override;

        const configuredMonthlyTarget = resolveMonthlyTarget(
          item.period_targets,
          p.period_label,
          p.period_index,
          p.start_date
        );

        periodObj.monthly_target = configuredMonthlyTarget;
        periodObj.period_target = configuredMonthlyTarget;
        periodObj.annual_target = item.annual_target != null ? Number(item.annual_target) : null;

        if (matchingRecord) {
          periodObj.status = matchingRecord.status;
          periodObj.planned_target = matchingRecord.planned_target ?? configuredMonthlyTarget;
          periodObj.reported_actual = matchingRecord.reported_actual;
          periodObj.local_unit = matchingRecord.local_unit;
          periodObj.standardized_target = matchingRecord.standardized_target;
          periodObj.standardized_actual = matchingRecord.standardized_actual;
          periodObj.standardized_unit = matchingRecord.standardized_unit;
          periodObj.achievement_percent = matchingRecord.achievement_percent;
          periodObj.monthly_achievement_percent = matchingRecord.achievement_percent;

          let annualAch = matchingRecord.annual_achievement_percent;
          if ((annualAch == null || isNaN(annualAch)) && periodObj.annual_target && periodObj.annual_target > 0) {
            const actualNum = Number(matchingRecord.standardized_actual ?? matchingRecord.reported_actual);
            if (!isNaN(actualNum)) {
              annualAch = Math.round((actualNum / periodObj.annual_target) * 1000) / 10;
            }
          }
          periodObj.annual_achievement_percent = annualAch ?? null;

          periodObj.publication_reference = matchingRecord.publication_reference;
          periodObj.published_record_id = matchingRecord.published_record_id;
          periodObj.published_at = matchingRecord.published_at;
          periodObj.submission_method = matchingRecord.submission_method;
          periodObj.narrative = matchingRecord.narrative;
        } else {
          // If not published yet, determine status based on node mapping if available
          if (activeMapping) {
            if (isValidated) {
              periodObj.status = "ready_to_publish";
            } else if (activeMapping.stage === "confirmed") {
              periodObj.status = "confirmed";
            } else {
              periodObj.status = "potential";
            }
            periodObj.planned_target = activeMapping.planNode?.period_target ?? configuredMonthlyTarget ?? null;
            periodObj.reported_actual = activeMapping.planNode?.period_actual ?? null;
          } else {
            periodObj.status = "unmapped";
            periodObj.planned_target = configuredMonthlyTarget ?? (item.annual_target != null ? Number(item.annual_target) : null);
            periodObj.reported_actual = null;
          }

          periodObj.achievement_percent = null;
          periodObj.monthly_achievement_percent = null;
          periodObj.annual_achievement_percent = null;
          periodObj.published_record_id = null;
          periodObj.publication_reference = null;
        }

        return periodObj;
      });

      const publishedCount = recurringPeriods.filter((p) => p.status === "published").length;
      if (publishedCount > 0) {
        workflowStatus =
          publishedCount === recurringPeriods.length ? "published" : "partially_published";
      }

      // Statistical analysis against regional preset annual target
      let cumulativeActual = 0;
      for (const pub of publishedRecords) {
        if (["published", "clarification_requested"].includes(pub.status)) {
          const val = pub.standardized_actual != null ? pub.standardized_actual : pub.reported_actual;
          if (val && !isNaN(Number(val))) {
            cumulativeActual += Number(val);
          }
        }
      }
      cumulativeActual = Math.round(cumulativeActual * 100) / 100;

      const annualRealizationRate =
        item.annual_target && Number(item.annual_target) > 0
          ? Math.round((cumulativeActual / Number(item.annual_target)) * 1000) / 10
          : null;

      item.workflowStatus = workflowStatus;
      item.activeMapping = activeMapping;
      item.isValidated = isValidated;
      item.recurringPeriods = recurringPeriods;
      item.annualRange = { startDate, endDate, frequency };
      item.isFormReportingActive = isFormEffective;
      item.nodeMappingAvailable = true; // Permanently available
      item.lock_overrides = lockOverrides;
      item.preset_annual_target = item.annual_target != null ? Number(item.annual_target) : null;
      item.cumulative_actual = cumulativeActual;
      item.annual_realization_rate = annualRealizationRate;
      item.latestPublishedRecord =
        publishedRecords.length > 0 ? publishedRecords[0] : null;

      return item;
    });
  }

  /**
   * Stage A: Create or Update Potential Regional Mapping
   */
  async createPotentialMapping(regionId, assignmentId, mappingPayload, userId) {
    const {
      regionalPlanNodeId,
      regionalPlanVersionId,
      notes = null,
      contributionRatio = 1.0,
    } = mappingPayload;

    // 1. Verify assignment belongs to this region
    const assignment = await NationalReportingAssignment.findOne({
      where: {
        assignment_id: assignmentId,
        region_id: regionId,
        status: "active",
      },
      include: [{ model: NationalReportingRequirement, as: "requirement" }],
    });

    if (!assignment) {
      const err = new Error("National reporting assignment not found or inactive for this region");
      err.status = 404;
      throw err;
    }

    // 2. Verify Regional Plan Node exists
    const planNode = await RegionalPlanNode.findByPk(regionalPlanNodeId);
    if (!planNode) {
      const err = new Error("Selected regional plan node not found");
      err.status = 404;
      throw err;
    }

    const req = assignment.requirement;
    const localUnit = await resolvePlanNodeUnit(planNode, regionId);

    // 3. Unit Compatibility Verification
    if (!areUnitsCompatible(localUnit, req.expected_unit)) {
      const err = new Error(
        `Unit mismatch: Regional plan node unit '${localUnit}' is incompatible with national required unit '${req.expected_unit}' (Category: ${req.unit_category}). Conversion is not mathematically possible.`
      );
      err.status = 400;
      throw err;
    }

    const conversionFactor = getConversionFactor(localUnit, req.expected_unit);

    // 4. Upsert mapping for this assignment
    let mapping = await RegionalRequirementMapping.findOne({
      where: {
        assignment_id: assignmentId,
        region_id: regionId,
      },
    });

    if (mapping) {
      mapping.regional_plan_node_id = regionalPlanNodeId;
      mapping.regional_plan_version_id = regionalPlanVersionId || planNode.regional_plan_version_id;
      mapping.local_unit = localUnit;
      mapping.unit_conversion_factor = conversionFactor;
      mapping.contribution_ratio = contributionRatio || 1.0;
      mapping.stage = "potential";
      mapping.notes = notes;
      mapping.updated_by = userId || null;
      await mapping.save();
    } else {
      mapping = await RegionalRequirementMapping.create({
        assignment_id: assignmentId,
        region_id: regionId,
        regional_plan_node_id: regionalPlanNodeId,
        regional_plan_version_id: regionalPlanVersionId || planNode.regional_plan_version_id,
        local_unit: localUnit,
        unit_conversion_factor: conversionFactor,
        contribution_ratio: contributionRatio || 1.0,
        stage: "potential",
        notes,
        created_by: userId || null,
      });
    }

    return mapping;
  }

  /**
   * Stage B: Confirm Mapping for an Active Reporting Period
   */
  async confirmMappingForPeriod(regionId, mappingId, confirmationPayload, userId) {
    const { executionPeriodVersionId, regionalPlanNodeId = null } = confirmationPayload;

    const mapping = await RegionalRequirementMapping.findOne({
      where: {
        mapping_id: mappingId,
        region_id: regionId,
      },
      include: [
        {
          model: NationalReportingAssignment,
          as: "assignment",
          include: [{ model: NationalReportingRequirement, as: "requirement" }],
        },
      ],
    });

    if (!mapping) {
      const err = new Error("Regional requirement mapping not found");
      err.status = 404;
      throw err;
    }

    // Verify reporting method is configured for node mapping
    const regionObj = mapping.region;
    if (regionObj && regionObj.national_reporting_method === "form_based") {
      const err = new Error(
        "Regional plan-node mapping publishing is disabled. This region is currently configured for Form-Based National Reporting."
      );
      err.status = 403;
      throw err;
    }

    // Verify execution period version belongs to this region
    const periodVersion = await RegionalPlanVersion.findOne({
      where: {
        regional_plan_version_id: executionPeriodVersionId,
        region_id: regionId,
      },
    });

    if (!periodVersion) {
      const err = new Error("Execution period plan version not found for this region");
      err.status = 404;
      throw err;
    }

    const targetNodeId = regionalPlanNodeId || mapping.regional_plan_node_id;
    const planNode = await RegionalPlanNode.findByPk(targetNodeId);
    if (!planNode) {
      const err = new Error("Regional plan node not found");
      err.status = 404;
      throw err;
    }

    // Re-verify unit compatibility
    const expectedUnit = mapping.assignment.requirement.expected_unit;
    const resolvedNodeUnit = await resolvePlanNodeUnit(planNode, regionId);
    const localUnit = resolvedNodeUnit || mapping.local_unit || "count";

    if (!areUnitsCompatible(localUnit, expectedUnit)) {
      const err = new Error(
        `Unit mismatch during confirmation: Node unit '${localUnit}' is incompatible with required unit '${expectedUnit}'.`
      );
      err.status = 400;
      throw err;
    }

    const conversionFactor = getConversionFactor(localUnit, expectedUnit);

    mapping.regional_plan_node_id = targetNodeId;
    mapping.confirmed_period_version_id = executionPeriodVersionId;
    mapping.local_unit = localUnit;
    mapping.unit_conversion_factor = conversionFactor;
    mapping.stage = "confirmed";
    mapping.confirmed_by = userId || null;
    mapping.confirmed_at = new Date();
    await mapping.save();

    return mapping;
  }

  /**
   * Remove mapping
   */
  async deleteMapping(regionId, mappingId) {
    const mapping = await RegionalRequirementMapping.findOne({
      where: {
        mapping_id: mappingId,
        region_id: regionId,
      },
    });

    if (!mapping) {
      const err = new Error("Mapping not found");
      err.status = 404;
      throw err;
    }

    const publishedCount = await NationalPublishedRecord.count({
      where: { mapping_id: mappingId },
    });

    if (publishedCount > 0) {
      mapping.stage = "archived";
      await mapping.save();
      return { archived: true, message: "Mapping has published records and was archived." };
    }

    await mapping.destroy();
    return { deleted: true };
  }

  /**
   * Publication Gateway: Publish Validated Regional Report to National Framework
   * Strictly enforces node.period_actual_status === 'validated'
   */
  async publishValidatedReport(regionId, mappingId, publishPayload, userId) {
    const { narrativeOverride = null } = publishPayload;

    // 1. Fetch mapping, assignment, and requirement
    const mapping = await RegionalRequirementMapping.findOne({
      where: {
        mapping_id: mappingId,
        region_id: regionId,
      },
      include: [
        {
          model: NationalReportingAssignment,
          as: "assignment",
          include: [{ model: NationalReportingRequirement, as: "requirement" }],
        },
        {
          model: Region,
          as: "region",
        },
      ],
    });

    if (!mapping) {
      const err = new Error("Regional requirement mapping not found");
      err.status = 404;
      throw err;
    }

    // Verify reporting method is configured for node mapping
    const regionObj = mapping.region;
    if (regionObj && regionObj.national_reporting_method === "form_based") {
      const err = new Error(
        "Regional plan-node mapping publishing is disabled. This region is currently configured for Form-Based National Reporting."
      );
      err.status = 403;
      throw err;
    }

    const assignment = mapping.assignment;
    if (!assignment || assignment.status !== "active") {
      const err = new Error("Assigned national requirement is no longer active");
      err.status = 400;
      throw err;
    }

    const requirement = assignment.requirement;
    if (!requirement || !requirement.is_active) {
      const err = new Error("National reporting requirement is inactive");
      err.status = 400;
      throw err;
    }

    // 2. Fetch the Regional Plan Node
    const planNode = await RegionalPlanNode.findByPk(mapping.regional_plan_node_id, {
      include: [
        {
          model: RegionalPlanVersion,
          as: "planVersion",
        },
        {
          model: User,
          as: "periodActualValidatedBy",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
    });

    if (!planNode) {
      const err = new Error("Regional plan node not found");
      err.status = 404;
      throw err;
    }

    // 3. STRICT PUBLICATION GATEWAY CHECK
    // Only fully validated regional achievements can enter the National Gateway
    const currentStatus = planNode.period_actual_status;
    if (currentStatus !== "validated") {
      const err = new Error(
        `Regional report cannot be published to the National Reporting Framework. Current status is '${currentStatus}'. Only reports that have completed the full regional validation workflow ('validated') can be published.`
      );
      err.status = 400;
      throw err;
    }

    // 4. Resolve reporting year and period label
    const planVersion = planNode.planVersion || {};
    const reportingYear = planVersion.planning_year || new Date().getFullYear();
    const periodLabel = planVersion.period_label || `Period ${planVersion.sequence_index || 1}`;
    const reportingPeriodId = planVersion.regional_plan_version_id || mapping.confirmed_period_version_id;

    // 5. Standardize target and actual with unit conversions
    const resolvedNodeUnit = await resolvePlanNodeUnit(planNode, regionId);
    const localUnit = resolvedNodeUnit || mapping.local_unit || "count";
    const expectedUnit = requirement.expected_unit;

    if (!areUnitsCompatible(localUnit, expectedUnit)) {
      const err = new Error(
        `Incompatible units during publication: local unit '${localUnit}' cannot be converted to required unit '${expectedUnit}'.`
      );
      err.status = 400;
      throw err;
    }

    const reportedActual = planNode.period_actual;
    const plannedTarget = planNode.period_target;

    const standardizedActual = convertValue(reportedActual, localUnit, expectedUnit);
    const standardizedTarget = convertValue(plannedTarget, localUnit, expectedUnit);

    const achievementPercent =
      standardizedTarget && standardizedTarget > 0
        ? Math.round((standardizedActual / standardizedTarget) * 1000) / 10
        : null;

    // 6. Idempotency Check: Existing published record for this requirement, region, year, and period
    const existingRecord = await NationalPublishedRecord.findOne({
      where: {
        requirement_id: requirement.requirement_id,
        region_id: regionId,
        reporting_year: reportingYear,
        reporting_period_label: periodLabel,
        status: { [Op.in]: ["published", "clarification_requested"] },
      },
    });

    let revisionNumber = 1;
    let supersededId = null;

    if (existingRecord) {
      // Check if data is already identical with float tolerance
      const isActualMatch =
        existingRecord.reported_actual === reportedActual ||
        Math.abs(Number(existingRecord.reported_actual) - Number(reportedActual)) < 0.0001;
      const isTargetMatch =
        existingRecord.planned_target === plannedTarget ||
        Math.abs(Number(existingRecord.planned_target) - Number(plannedTarget)) < 0.0001;

      if (isActualMatch && isTargetMatch && existingRecord.status === "published") {
        // Idempotent response
        return {
          idempotent: true,
          publishedRecord: existingRecord,
          receipt: {
            publicationReference: existingRecord.publication_reference,
            publishedAt: existingRecord.published_at,
            status: existingRecord.status,
            revisionNumber: existingRecord.revision_number,
            message: "Report was already published with identical validated values.",
          },
        };
      }

      // If re-publishing with an updated validation, supersede the old one
      revisionNumber = existingRecord.revision_number + 1;
      supersededId = existingRecord.published_record_id;
      existingRecord.status = "superseded";
      await existingRecord.save();
    }

    // 7. Generate publication reference code
    const cleanPeriod = periodLabel.replace(/[\s\-_]+/g, "");
    const regionCode = (mapping.region?.code || "REG").toUpperCase();
    const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const publicationReference = `NAT-PUB-${reportingYear}-${cleanPeriod}-${regionCode}-${hex}`;

    // 8. Construct immutable snapshot JSON
    const snapshotData = {
      publicationReference,
      publicationTimestamp: new Date().toISOString(),
      requirement: {
        id: requirement.requirement_id,
        code: requirement.code,
        title: requirement.title,
        category: requirement.category,
        expectedUnit: requirement.expected_unit,
        unitCategory: requirement.unit_category,
        frequency: requirement.frequency,
      },
      region: {
        id: regionId,
        name: mapping.region?.name || "Regional State",
        code: mapping.region?.code || "REG",
      },
      planContext: {
        planVersionId: planVersion.regional_plan_version_id,
        planDraftName: planVersion.draft_name,
        planVersionKind: planVersion.version_kind,
        reportingYear,
        periodLabel,
      },
      nodeProvenance: {
        nodeId: planNode.regional_plan_node_id,
        title: planNode.title,
        level: planNode.level,
        weight: planNode.weight,
        localUnit,
      },
      measurements: {
        plannedTarget,
        reportedActual,
        localUnit,
        standardizedTarget,
        standardizedActual,
        standardizedUnit: expectedUnit,
        conversionFactor: mapping.unit_conversion_factor,
        achievementPercent,
      },
      regionalValidation: {
        validatedAt: planNode.period_actual_validated_at,
        validatedBy: planNode.periodActualValidatedBy
          ? {
              userId: planNode.periodActualValidatedBy.user_id,
              name: planNode.periodActualValidatedBy.full_name,
              email: planNode.periodActualValidatedBy.email,
            }
          : null,
      },
      narrative: narrativeOverride || planNode.narration || null,
      evidenceAttachments: planNode.evidence_attachment_ids || [],
    };

    // 9. Create NationalPublishedRecord
    const publishedRecord = await NationalPublishedRecord.create({
      publication_reference: publicationReference,
      requirement_id: requirement.requirement_id,
      assignment_id: assignment.assignment_id,
      mapping_id: mapping.mapping_id,
      region_id: regionId,
      regional_plan_node_id: planNode.regional_plan_node_id,
      regional_plan_version_id: planVersion.regional_plan_version_id,
      reporting_year: reportingYear,
      reporting_period_label: periodLabel,
      reporting_period_id: reportingPeriodId,
      planned_target: plannedTarget,
      reported_actual: reportedActual,
      local_unit: localUnit,
      standardized_target: standardizedTarget,
      standardized_actual: standardizedActual,
      standardized_unit: expectedUnit,
      achievement_percent: achievementPercent,
      annual_target: assignment.annual_target != null ? Number(assignment.annual_target) : null,
      annual_achievement_percent:
        assignment.annual_target && Number(assignment.annual_target) > 0 && standardizedActual !== null
          ? Math.round((standardizedActual / Number(assignment.annual_target)) * 1000) / 10
          : null,
      narrative: narrativeOverride || planNode.narration || null,
      evidence_attachments: planNode.evidence_attachment_ids || [],
      regional_validated_by: planNode.period_actual_validated_by || null,
      regional_validated_at: planNode.period_actual_validated_at || null,
      published_by: userId || null,
      published_at: new Date(),
      revision_number: revisionNumber,
      superseded_by_id: null,
      status: "published",
      snapshot_data: snapshotData,
    });

    if (supersededId && existingRecord) {
      existingRecord.superseded_by_id = publishedRecord.published_record_id;
      await existingRecord.save();
    }

    // Dispatch system-wide notifications
    await notifyNationalReportSubmission({
      publishedRecord,
      requirement,
      region: mapping.region,
      reportingPeriodLabel: periodLabel,
      reportingYear,
      numActual: reportedActual,
      numTarget: plannedTarget,
      expectedUnit,
      achievementPercent,
      publicationReference,
      userId,
    });

    return {
      success: true,
      publishedRecord,
      receipt: {
        publicationReference,
        publishedAt: publishedRecord.published_at,
        status: "published",
        revisionNumber,
        requirementCode: requirement.code,
        requirementTitle: requirement.title,
        regionName: mapping.region?.name,
        reportingPeriod: `${reportingYear} ${periodLabel}`,
        standardizedValue: `${standardizedActual} ${expectedUnit}`,
        achievementPercent: `${achievementPercent || 0}%`,
        message: "Validated regional report published successfully to the National Reporting Framework.",
      },
    };
  }

  /**
   * List Publication Receipts and History for this Region
   */
  async listPublicationHistoryForRegion(regionId, filters = {}) {
    const where = { region_id: regionId };
    if (filters.reporting_year) where.reporting_year = parseInt(filters.reporting_year, 10);
    if (filters.status) where.status = filters.status;

    return await NationalPublishedRecord.findAll({
      where,
      include: [
        {
          model: NationalReportingRequirement,
          as: "requirement",
          attributes: ["requirement_id", "code", "title", "category", "expected_unit"],
        },
        {
          model: User,
          as: "publishedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: User,
          as: "validatedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [
        ["reporting_year", "DESC"],
        ["published_at", "DESC"],
      ],
    });
  }

  /**
   * Get National Reporting Configuration for a Region
   * Node mapping and form-based reporting are mutually exclusive, with form_based as default.
   */
  async getRegionReportingConfig(regionId) {
    const region = await Region.findByPk(regionId, {
      attributes: [
        "region_id",
        "name",
        "code",
        "national_reporting_method",
        "form_reporting_active",
        "form_reporting_start_date",
        "form_reporting_end_date",
        "form_reporting_notes",
      ],
    });

    if (!region) {
      const err = new Error("Region not found");
      err.status = 404;
      throw err;
    }

    const isEffective = isRegionFormReportingEffective(region);
    const activeMethod =
      region.national_reporting_method ||
      (region.form_reporting_active ? "form_based" : "node_mapping") ||
      "form_based";

    return {
      region_id: region.region_id,
      name: region.name,
      code: region.code,
      national_reporting_method: activeMethod,
      node_mapping_available: activeMethod === "node_mapping",
      form_reporting_active: activeMethod === "form_based",
      form_reporting_start_date: region.form_reporting_start_date,
      form_reporting_end_date: region.form_reporting_end_date,
      form_reporting_notes: region.form_reporting_notes,
      is_form_reporting_effective: isEffective,
    };
  }

  /**
   * Update National Reporting Configuration for a Region (Federal / Private Admin)
   * Enforces mutually exclusive selection: either form_based (default) or node_mapping.
   */
  async updateRegionReportingConfig(regionId, data, userId) {
    const region = await Region.findByPk(regionId);
    if (!region) {
      const err = new Error("Region not found");
      err.status = 404;
      throw err;
    }

    const {
      national_reporting_method,
      form_reporting_active,
      form_reporting_start_date,
      form_reporting_end_date,
      form_reporting_notes,
    } = data;

    // Mutually exclusive: either form_based (default) or node_mapping
    const targetMethod =
      national_reporting_method ||
      (form_reporting_active === true
        ? "form_based"
        : form_reporting_active === false
        ? "node_mapping"
        : "form_based");

    region.national_reporting_method = targetMethod;
    region.form_reporting_active = targetMethod === "form_based";

    if (form_reporting_start_date !== undefined) {
      region.form_reporting_start_date = form_reporting_start_date || null;
    }

    if (form_reporting_end_date !== undefined) {
      region.form_reporting_end_date = form_reporting_end_date || null;
    }

    if (form_reporting_notes !== undefined) {
      region.form_reporting_notes = form_reporting_notes || null;
    }

    await region.save();

    return this.getRegionReportingConfig(regionId);
  }

  /**
   * Option B: Submit KPI Target and Achievement directly via Form
   */
  async submitDirectFormReport(regionId, payload, userId) {
    const region = await Region.findByPk(regionId);
    if (!region) {
      const err = new Error("Region not found");
      err.status = 404;
      throw err;
    }

    // 1. Verify that Form-based Reporting is currently active and effective for this region
    const isEffective = isRegionFormReportingEffective(region);
    if (!isEffective) {
      const err = new Error(
        "Form-based National Reporting is currently deactivated or expired for this region. Please use the plan-node mapping workflow or contact the national administrator."
      );
      err.status = 403;
      throw err;
    }

    const {
      requirementId,
      assignmentId,
      reportingYear,
      reportingPeriodLabel,
      plannedTarget,
      reportedActual,
      localUnit,
      narrative,
      evidenceAttachments,
    } = payload;

    if (!requirementId && !assignmentId) {
      const err = new Error("requirementId or assignmentId is required");
      err.status = 400;
      throw err;
    }

    if (!reportingYear || !reportingPeriodLabel) {
      const err = new Error("reportingYear and reportingPeriodLabel are required");
      err.status = 400;
      throw err;
    }

    // 2. Find Assignment
    let assignment = null;
    if (assignmentId) {
      assignment = await NationalReportingAssignment.findOne({
        where: { assignment_id: assignmentId, region_id: regionId },
        include: [{ model: NationalReportingRequirement, as: "requirement" }],
      });
    } else {
      assignment = await NationalReportingAssignment.findOne({
        where: { requirement_id: requirementId, region_id: regionId },
        include: [{ model: NationalReportingRequirement, as: "requirement" }],
      });
    }

    if (!assignment || !assignment.requirement) {
      const err = new Error("National reporting requirement is not assigned to this region");
      err.status = 404;
      throw err;
    }

    const requirement = assignment.requirement;
    const expectedUnit = requirement.expected_unit;

    // 2b. Verify Period Lock & Window Status (Lock Enforcement)
    const startDate =
      assignment.effective_start_date ||
      requirement.effective_start_date ||
      `${new Date().getFullYear()}-07-01`;
    const endDate =
      assignment.effective_end_date ||
      requirement.effective_end_date ||
      calculateAnnualEndDate(startDate);
    const frequency = assignment.frequency_override || requirement.frequency || "quarterly";
    const generatedPeriods = generateReportingPeriods(startDate, endDate, frequency);
    const targetPeriod = generatedPeriods.find(
      (p) => p.period_label.toLowerCase() === String(reportingPeriodLabel).trim().toLowerCase()
    );

    if (targetPeriod) {
      const lockOverrides = assignment.lock_overrides || {};
      const deadlineDays =
        assignment.submission_deadline_days ||
        requirement.submission_deadline_days ||
        requirement.validation_rules?.submission_deadline_days ||
        15;
      const activeOverride =
        lockOverrides[targetPeriod.period_label] ||
        lockOverrides[String(targetPeriod.period_label).toUpperCase()] ||
        (targetPeriod.division_label ? lockOverrides[targetPeriod.division_label] : null) ||
        null;

      const periodLock = computePeriodLockStatus({
        period: targetPeriod,
        lockOverride: activeOverride,
        deadlineDays,
      });

      if (periodLock.is_locked) {
        const err = new Error(
          `Reporting for period '${reportingPeriodLabel}' is currently locked. ${periodLock.lock_reason}`
        );
        err.status = 403;
        throw err;
      }
    }

    // Defined unit KPI from federal should NOT be edited in regional (display only).
    // Enforce strictly using expectedUnit from federal requirement.
    const submittedUnit = expectedUnit;

    const numActual =
      reportedActual !== undefined && reportedActual !== null && reportedActual !== ""
        ? Number(reportedActual)
        : null;

    if (numActual !== null && isNaN(numActual)) {
      const err = new Error("Reported actual must be a valid number");
      err.status = 400;
      throw err;
    }

    // 1. Resolve Monthly Target for this period
    let monthlyTarget = resolveMonthlyTarget(
      assignment.period_targets,
      reportingPeriodLabel,
      null,
      null
    );
    if (monthlyTarget === null && plannedTarget !== undefined && plannedTarget !== null && plannedTarget !== "" && !isNaN(Number(plannedTarget))) {
      monthlyTarget = Number(plannedTarget);
    }

    // 2. Resolve Annual Target
    const annualTarget =
      assignment.annual_target !== null && assignment.annual_target !== undefined && !isNaN(Number(assignment.annual_target))
        ? Number(assignment.annual_target)
        : null;

    // Effective period planned target (monthly target if set, otherwise fallback to annual target)
    const effectivePeriodTarget = monthlyTarget != null ? monthlyTarget : annualTarget;

    if (effectivePeriodTarget !== null && isNaN(effectivePeriodTarget)) {
      const err = new Error("Planned target must be a valid number");
      err.status = 400;
      throw err;
    }

    const standardizedActual = convertValue(numActual, submittedUnit, expectedUnit);
    const standardizedTarget = convertValue(effectivePeriodTarget, submittedUnit, expectedUnit);

    // Monthly achievement rate
    const monthlyAchievementPercent =
      standardizedTarget && standardizedTarget > 0 && standardizedActual !== null
        ? Math.round((standardizedActual / standardizedTarget) * 1000) / 10
        : null;

    // Annual contribution achievement rate
    const annualAchievementPercent =
      annualTarget && annualTarget > 0 && standardizedActual !== null
        ? Math.round((standardizedActual / annualTarget) * 1000) / 10
        : null;

    // 4. Supersede any existing active record for the same period to guarantee NO DOUBLE COUNTING
    const existingRecord = await NationalPublishedRecord.findOne({
      where: {
        requirement_id: requirement.requirement_id,
        region_id: regionId,
        reporting_year: Number(reportingYear),
        reporting_period_label: String(reportingPeriodLabel).trim(),
        status: { [Op.in]: ["published", "clarification_requested"] },
      },
    });

    let revisionNumber = 1;
    let supersededId = null;

    if (existingRecord) {
      revisionNumber = existingRecord.revision_number + 1;
      supersededId = existingRecord.published_record_id;
      existingRecord.status = "superseded";
      await existingRecord.save();
    }

    // 5. Generate publication reference code
    const cleanPeriod = String(reportingPeriodLabel).replace(/[\s\-_]+/g, "");
    const regionCode = (region.code || "REG").toUpperCase();
    const hex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const publicationReference = `NAT-PUB-FORM-${reportingYear}-${cleanPeriod}-${regionCode}-${hex}`;

    // 6. Snapshot data
    const snapshotData = {
      submissionMethod: "form_based",
      publicationReference,
      publicationTimestamp: new Date().toISOString(),
      requirement: {
        id: requirement.requirement_id,
        code: requirement.code,
        title: requirement.title,
        category: requirement.category,
        expectedUnit: requirement.expected_unit,
        unitCategory: requirement.unit_category,
      },
      region: {
        id: region.region_id,
        name: region.name,
        code: region.code,
      },
      values: {
        reportingYear: Number(reportingYear),
        reportingPeriodLabel: String(reportingPeriodLabel).trim(),
        reportedActual: numActual,
        plannedTarget: effectivePeriodTarget,
        monthlyTarget,
        annualTarget,
        localUnit: submittedUnit,
        standardizedActual,
        standardizedTarget,
        standardizedUnit: expectedUnit,
        achievementPercent: monthlyAchievementPercent,
        annualAchievementPercent,
      },
      narrative: narrative || null,
      evidenceAttachments: evidenceAttachments || [],
      publishedBy: userId || null,
    };

    // 7. Create National Published Record
    const publishedRecord = await NationalPublishedRecord.create({
      publication_reference: publicationReference,
      requirement_id: requirement.requirement_id,
      assignment_id: assignment.assignment_id,
      mapping_id: null,
      region_id: regionId,
      regional_plan_node_id: null,
      regional_plan_version_id: null,
      submission_method: "form_based",
      reporting_year: Number(reportingYear),
      reporting_period_label: String(reportingPeriodLabel).trim(),
      reporting_period_id: null,
      planned_target: effectivePeriodTarget,
      reported_actual: numActual,
      local_unit: submittedUnit,
      standardized_target: standardizedTarget,
      standardized_actual: standardizedActual,
      standardized_unit: expectedUnit,
      achievement_percent: monthlyAchievementPercent,
      annual_target: annualTarget,
      annual_achievement_percent: annualAchievementPercent,
      narrative: narrative || null,
      evidence_attachments: evidenceAttachments || [],
      regional_validated_by: userId || null,
      regional_validated_at: new Date(),
      published_by: userId || null,
      published_at: new Date(),
      revision_number: revisionNumber,
      status: "published",
      snapshot_data: snapshotData,
    });

    if (supersededId && existingRecord) {
      existingRecord.superseded_by_id = publishedRecord.published_record_id;
      await existingRecord.save();
    }

    // Dispatch system-wide notifications
    await notifyNationalReportSubmission({
      publishedRecord,
      requirement,
      region,
      reportingPeriodLabel,
      reportingYear,
      numActual,
      numTarget,
      expectedUnit,
      achievementPercent,
      publicationReference,
      userId,
    });

    return {
      publishedRecord,
      receipt: {
        publicationReference,
        publishedAt: publishedRecord.published_at,
        status: publishedRecord.status,
        revisionNumber,
        supersededRecordId: supersededId,
        standardizedTarget,
        standardizedActual,
        standardizedUnit: expectedUnit,
        achievementPercent,
        message: "KPI Report published directly via National Reporting Form successfully.",
      },
    };
  }

  /**
   * Get version history for a submitted requirement period
   * Shows every revision (v1, v2, v3...), submitter provenance, and calculated diffs.
   */
  async getSubmissionVersions(params = {}) {
    const { record_id, requirement_id, region_id, reporting_year, reporting_period_label } = params;

    let targetReqId = requirement_id;
    let targetRegId = region_id;
    let targetYear = reporting_year ? Number(reporting_year) : null;
    let targetPeriod = reporting_period_label ? String(reporting_period_label).trim() : null;

    if (record_id) {
      const baseRec = await NationalPublishedRecord.findByPk(record_id);
      if (baseRec) {
        targetReqId = baseRec.requirement_id;
        targetRegId = baseRec.region_id;
        targetYear = baseRec.reporting_year;
        targetPeriod = baseRec.reporting_period_label;
      }
    }

    if (!targetReqId || !targetRegId) {
      const err = new Error("Requirement ID and Region ID are required to inspect version history.");
      err.status = 400;
      throw err;
    }

    const where = {
      requirement_id: targetReqId,
      region_id: targetRegId,
    };
    if (targetYear) where.reporting_year = targetYear;
    if (targetPeriod) where.reporting_period_label = { [Op.iLike]: targetPeriod };

    const rawRecords = await NationalPublishedRecord.findAll({
      where,
      include: [
        {
          model: NationalReportingRequirement,
          as: "requirement",
          attributes: ["requirement_id", "code", "title", "expected_unit", "unit_category", "frequency"],
        },
        {
          model: Region,
          as: "region",
          attributes: ["region_id", "name", "code"],
        },
        {
          model: User,
          as: "publishedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
        {
          model: User,
          as: "validatedByUser",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [
        ["revision_number", "ASC"],
        ["published_at", "ASC"],
      ],
    });

    // Compute version diffs
    const versions = rawRecords.map((rec, index) => {
      const prev = index > 0 ? rawRecords[index - 1] : null;

      const targetDiff =
        prev && rec.planned_target !== null && prev.planned_target !== null
          ? Math.round((rec.planned_target - prev.planned_target) * 100) / 100
          : null;

      const actualDiff =
        prev && rec.reported_actual !== null && prev.reported_actual !== null
          ? Math.round((rec.reported_actual - prev.reported_actual) * 100) / 100
          : null;

      const achievementDiff =
        prev && rec.achievement_percent !== null && prev.achievement_percent !== null
          ? Math.round((rec.achievement_percent - prev.achievement_percent) * 10) / 10
          : null;

      const narrativeChanged = Boolean(prev && rec.narrative !== prev.narrative);

      return {
        ...rec.toJSON(),
        is_latest: rec.status === "published",
        version_label: `v${rec.revision_number}`,
        diff: prev
          ? {
              previous_version: `v${prev.revision_number}`,
              target_diff: targetDiff,
              actual_diff: actualDiff,
              achievement_diff: achievementDiff,
              narrative_changed: narrativeChanged,
            }
          : null,
      };
    });

    return {
      requirement_id: targetReqId,
      region_id: targetRegId,
      reporting_year: targetYear,
      reporting_period_label: targetPeriod,
      total_versions: versions.length,
      versions,
    };
  }
}

module.exports = new RegionalNationalReportingService();
