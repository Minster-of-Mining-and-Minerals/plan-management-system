"use strict";

const { Op } = require("sequelize");
const crypto = require("crypto");
const db = require("../models");
const {
  areUnitsCompatible,
  getConversionFactor,
  convertValue,
} = require("../utils/nationalUnitCompatibilityUtils");

const {
  NationalReportingRequirement,
  NationalReportingAssignment,
  RegionalRequirementMapping,
  NationalPublishedRecord,
  RegionalPlanNode,
  RegionalPlanVersion,
  Region,
  User,
} = db;

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

      const hasPublished = item.publishedRecords && item.publishedRecords.length > 0;
      if (hasPublished) {
        workflowStatus = "published";
      }

      item.workflowStatus = workflowStatus;
      item.activeMapping = activeMapping;
      item.isValidated = isValidated;
      item.latestPublishedRecord = hasPublished ? item.publishedRecords[0] : null;

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
    const localUnit = planNode.target_unit || "count";

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
    const localUnit = planNode.target_unit || mapping.local_unit;

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
    const localUnit = planNode.target_unit || mapping.local_unit;
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
}

module.exports = new RegionalNationalReportingService();
