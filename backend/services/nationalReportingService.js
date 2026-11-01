"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const {
  NationalReportingRequirement,
  NationalReportingAssignment,
  RegionalRequirementMapping,
  NationalPublishedRecord,
  Region,
  User,
} = db;

/**
 * Federal National Reporting Service
 */
class NationalReportingService {
  /**
   * Create a new National Reporting Requirement
   */
  async createRequirement(data, userId) {
    const existing = await NationalReportingRequirement.findOne({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existing) {
      const err = new Error(`A national reporting requirement with code '${data.code}' already exists`);
      err.status = 400;
      throw err;
    }

    const requirement = await NationalReportingRequirement.create({
      code: data.code.trim().toUpperCase(),
      title: data.title.trim(),
      description: data.description || null,
      category: data.category || "mining_production",
      expected_unit: data.expected_unit.trim(),
      unit_category: data.unit_category || "mass",
      frequency: data.frequency || "quarterly",
      requires_numeric: data.requires_numeric !== undefined ? data.requires_numeric : true,
      requires_narrative: !!data.requires_narrative,
      requires_evidence: !!data.requires_evidence,
      validation_rules: data.validation_rules || {},
      effective_start_date: data.effective_start_date || null,
      effective_end_date: data.effective_end_date || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      version_number: 1,
      created_by: userId || null,
    });

    return requirement;
  }

  /**
   * Update an existing National Reporting Requirement
   */
  async updateRequirement(requirementId, data, userId) {
    const requirement = await NationalReportingRequirement.findByPk(requirementId);
    if (!requirement) {
      const err = new Error("National reporting requirement not found");
      err.status = 404;
      throw err;
    }

    if (data.code && data.code.trim().toUpperCase() !== requirement.code) {
      const duplicate = await NationalReportingRequirement.findOne({
        where: {
          code: data.code.trim().toUpperCase(),
          requirement_id: { [Op.ne]: requirementId },
        },
      });
      if (duplicate) {
        const err = new Error(`Requirement with code '${data.code}' already exists`);
        err.status = 400;
        throw err;
      }
      requirement.code = data.code.trim().toUpperCase();
    }

    if (data.title !== undefined) requirement.title = data.title.trim();
    if (data.description !== undefined) requirement.description = data.description;
    if (data.category !== undefined) requirement.category = data.category;
    if (data.expected_unit !== undefined) requirement.expected_unit = data.expected_unit.trim();
    if (data.unit_category !== undefined) requirement.unit_category = data.unit_category;
    if (data.frequency !== undefined) requirement.frequency = data.frequency;
    if (data.requires_numeric !== undefined) requirement.requires_numeric = data.requires_numeric;
    if (data.requires_narrative !== undefined) requirement.requires_narrative = data.requires_narrative;
    if (data.requires_evidence !== undefined) requirement.requires_evidence = data.requires_evidence;
    if (data.validation_rules !== undefined) requirement.validation_rules = data.validation_rules;
    if (data.effective_start_date !== undefined) requirement.effective_start_date = data.effective_start_date;
    if (data.effective_end_date !== undefined) requirement.effective_end_date = data.effective_end_date;
    if (data.is_active !== undefined) requirement.is_active = data.is_active;

    requirement.version_number += 1;
    requirement.updated_by = userId || null;

    await requirement.save();
    return requirement;
  }

  /**
   * Delete or soft-delete a requirement
   */
  async deleteRequirement(requirementId) {
    const requirement = await NationalReportingRequirement.findByPk(requirementId);
    if (!requirement) {
      const err = new Error("National reporting requirement not found");
      err.status = 404;
      throw err;
    }

    const publishedCount = await NationalPublishedRecord.count({
      where: { requirement_id: requirementId },
    });
    if (publishedCount > 0) {
      // If records already published, deactivate rather than delete to protect audit trail
      requirement.is_active = false;
      await requirement.save();
      return { deactivated: true, message: "Requirement has published records and was marked inactive." };
    }

    await requirement.destroy();
    return { deleted: true };
  }

  /**
   * List National Reporting Requirements with summary counters
   */
  async listRequirements(filters = {}) {
    const where = {};
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.is_active !== undefined && filters.is_active !== null && filters.is_active !== "") {
      where.is_active = filters.is_active === true || filters.is_active === "true";
    }
    if (filters.search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${filters.search}%` } },
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const requirements = await NationalReportingRequirement.findAll({
      where,
      include: [
        {
          model: NationalReportingAssignment,
          as: "assignments",
          where: { status: "active" },
          required: false,
          include: [
            {
              model: Region,
              as: "region",
              attributes: ["region_id", "name", "code"],
            },
          ],
        },
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return requirements.map((req) => {
      const item = req.toJSON();
      item.assignedRegionsCount = item.assignments ? item.assignments.length : 0;
      return item;
    });
  }

  /**
   * Get requirement by ID with full details
   */
  async getRequirementById(requirementId) {
    const requirement = await NationalReportingRequirement.findByPk(requirementId, {
      include: [
        {
          model: NationalReportingAssignment,
          as: "assignments",
          include: [
            {
              model: Region,
              as: "region",
              attributes: ["region_id", "name", "code"],
            },
            {
              model: RegionalRequirementMapping,
              as: "mappings",
              where: { stage: { [Op.in]: ["potential", "confirmed"] } },
              required: false,
            },
          ],
        },
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "full_name", "email"],
        },
      ],
    });

    if (!requirement) {
      const err = new Error("National reporting requirement not found");
      err.status = 404;
      throw err;
    }

    return requirement;
  }

  /**
   * Assign requirement to one or multiple regions
   */
  async assignRequirementToRegions(requirementId, assignmentPayload, userId) {
    const {
      regionIds = [],
      isMandatory = true,
      effectiveStartDate = null,
      effectiveEndDate = null,
      frequencyOverride = null,
      notes = null,
    } = assignmentPayload;

    const requirement = await NationalReportingRequirement.findByPk(requirementId);
    if (!requirement) {
      const err = new Error("National reporting requirement not found");
      err.status = 404;
      throw err;
    }

    if (!Array.isArray(regionIds) || regionIds.length === 0) {
      const err = new Error("At least one region must be selected for assignment");
      err.status = 400;
      throw err;
    }

    const createdAssignments = [];
    for (const regionId of regionIds) {
      const existing = await NationalReportingAssignment.findOne({
        where: {
          requirement_id: requirementId,
          region_id: regionId,
        },
      });

      if (existing) {
        existing.status = "active";
        existing.is_mandatory = isMandatory;
        existing.effective_start_date = effectiveStartDate;
        existing.effective_end_date = effectiveEndDate;
        existing.frequency_override = frequencyOverride;
        existing.notes = notes;
        existing.assigned_by = userId || null;
        existing.assigned_at = new Date();
        await existing.save();
        createdAssignments.push(existing);
      } else {
        const assignment = await NationalReportingAssignment.create({
          requirement_id: requirementId,
          region_id: regionId,
          is_mandatory: isMandatory,
          effective_start_date: effectiveStartDate,
          effective_end_date: effectiveEndDate,
          frequency_override: frequencyOverride,
          status: "active",
          notes,
          assigned_by: userId || null,
          assigned_at: new Date(),
        });
        createdAssignments.push(assignment);
      }
    }

    return createdAssignments;
  }

  /**
   * Update an existing assignment (suspend, withdraw, or update properties)
   */
  async updateAssignment(assignmentId, updateData) {
    const assignment = await NationalReportingAssignment.findByPk(assignmentId, {
      include: [
        { model: Region, as: "region" },
        { model: NationalReportingRequirement, as: "requirement" },
      ],
    });

    if (!assignment) {
      const err = new Error("Assignment not found");
      err.status = 404;
      throw err;
    }

    if (updateData.status) assignment.status = updateData.status;
    if (updateData.is_mandatory !== undefined) assignment.is_mandatory = updateData.is_mandatory;
    if (updateData.frequency_override !== undefined) assignment.frequency_override = updateData.frequency_override;
    if (updateData.notes !== undefined) assignment.notes = updateData.notes;
    if (updateData.effective_start_date !== undefined) assignment.effective_start_date = updateData.effective_start_date;
    if (updateData.effective_end_date !== undefined) assignment.effective_end_date = updateData.effective_end_date;

    await assignment.save();
    return assignment;
  }

  /**
   * List assignments with filtering
   */
  async listAssignments(filters = {}) {
    const where = {};
    if (filters.requirement_id) where.requirement_id = filters.requirement_id;
    if (filters.region_id) where.region_id = filters.region_id;
    if (filters.status) where.status = filters.status;

    return await NationalReportingAssignment.findAll({
      where,
      include: [
        {
          model: NationalReportingRequirement,
          as: "requirement",
        },
        {
          model: Region,
          as: "region",
          attributes: ["region_id", "name", "code"],
        },
        {
          model: RegionalRequirementMapping,
          as: "mappings",
          attributes: ["mapping_id", "stage", "local_unit", "unit_conversion_factor", "confirmed_at"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
  }

  /**
   * List nationally published records
   */
  async listPublishedRecords(filters = {}) {
    const where = {};
    if (filters.requirement_id) where.requirement_id = filters.requirement_id;
    if (filters.region_id) where.region_id = filters.region_id;
    if (filters.reporting_year) where.reporting_year = parseInt(filters.reporting_year, 10);
    if (filters.reporting_period_label) where.reporting_period_label = filters.reporting_period_label;
    if (filters.status) where.status = filters.status;

    if (filters.search) {
      where[Op.or] = [
        { publication_reference: { [Op.iLike]: `%${filters.search}%` } },
        { narrative: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    return await NationalPublishedRecord.findAll({
      where,
      include: [
        {
          model: NationalReportingRequirement,
          as: "requirement",
          attributes: ["requirement_id", "code", "title", "category", "expected_unit", "frequency"],
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
        ["reporting_year", "DESC"],
        ["published_at", "DESC"],
      ],
    });
  }

  /**
   * Get single published record
   */
  async getPublishedRecordById(recordId) {
    const record = await NationalPublishedRecord.findByPk(recordId, {
      include: [
        {
          model: NationalReportingRequirement,
          as: "requirement",
        },
        {
          model: Region,
          as: "region",
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
    });

    if (!record) {
      const err = new Error("Published national record not found");
      err.status = 404;
      throw err;
    }

    return record;
  }

  /**
   * Request clarification from region on published record
   */
  async requestClarification(recordId, clarificationNotes, userId) {
    const record = await NationalPublishedRecord.findByPk(recordId);
    if (!record) {
      const err = new Error("Published national record not found");
      err.status = 404;
      throw err;
    }

    record.status = "clarification_requested";
    record.clarification_notes = clarificationNotes;
    await record.save();

    return record;
  }

  /**
   * National Monitoring Dashboard Aggregates & Analytics
   */
  async getNationalDashboardSummary(filters = {}) {
    const currentYear = filters.reporting_year ? parseInt(filters.reporting_year, 10) : new Date().getFullYear();
    const periodLabel = filters.reporting_period_label || null;

    // 1. High-level metric counts
    const totalRequirementsCount = await NationalReportingRequirement.count({
      where: { is_active: true },
    });

    const activeAssignments = await NationalReportingAssignment.findAll({
      where: { status: "active" },
      include: [
        { model: Region, as: "region", attributes: ["region_id", "name", "code"] },
        { model: NationalReportingRequirement, as: "requirement" },
        {
          model: RegionalRequirementMapping,
          as: "mappings",
          where: { stage: { [Op.in]: ["potential", "confirmed"] } },
          required: false,
        },
      ],
    });

    const totalAssignmentsCount = activeAssignments.length;

    // Unique regions assigned
    const assignedRegionMap = new Map();
    activeAssignments.forEach((a) => {
      if (a.region) assignedRegionMap.set(a.region.region_id, a.region);
    });

    const totalAssignedRegionsCount = assignedRegionMap.size;

    // Published records for the filter period
    const pubWhere = {
      reporting_year: currentYear,
      status: { [Op.in]: ["published", "clarification_requested"] },
    };
    if (periodLabel && periodLabel !== "all") {
      pubWhere.reporting_period_label = periodLabel;
    }

    const publishedRecords = await NationalPublishedRecord.findAll({
      where: pubWhere,
      include: [
        { model: NationalReportingRequirement, as: "requirement" },
        { model: Region, as: "region", attributes: ["region_id", "name", "code"] },
      ],
    });

    const totalPublishedSubmissions = publishedRecords.length;

    // 2. Mapped assignments vs unmapped
    let mappedCount = 0;
    let confirmedCount = 0;
    activeAssignments.forEach((a) => {
      const hasMappings = a.mappings && a.mappings.length > 0;
      if (hasMappings) {
        mappedCount += 1;
        if (a.mappings.some((m) => m.stage === "confirmed")) {
          confirmedCount += 1;
        }
      }
    });

    // 3. Regional compliance tracking
    const regionalCompliance = [];
    for (const [regionId, region] of assignedRegionMap.entries()) {
      const regionAssignments = activeAssignments.filter((a) => a.region_id === regionId);
      const regionPublished = publishedRecords.filter((p) => p.region_id === regionId);

      const assignedCount = regionAssignments.length;
      const submittedCount = regionPublished.length;
      const complianceRate = assignedCount > 0 ? Math.round((submittedCount / assignedCount) * 100) : 0;

      regionalCompliance.push({
        regionId,
        regionName: region.name,
        regionCode: region.code,
        assignedRequirementsCount: assignedCount,
        publishedSubmissionsCount: submittedCount,
        missingSubmissionsCount: Math.max(0, assignedCount - submittedCount),
        complianceRate,
        status: complianceRate === 100 ? "complete" : complianceRate > 0 ? "partial" : "pending",
      });
    }

    // 4. Indicator / Requirement Aggregates (Standardized National Totals)
    const requirementSummaries = [];
    const requirementsMap = new Map();

    activeAssignments.forEach((a) => {
      if (!requirementsMap.has(a.requirement_id)) {
        requirementsMap.set(a.requirement_id, {
          requirement: a.requirement,
          assignedRegionsCount: 0,
          publishedRecords: [],
        });
      }
      requirementsMap.get(a.requirement_id).assignedRegionsCount += 1;
    });

    publishedRecords.forEach((p) => {
      if (requirementsMap.has(p.requirement_id)) {
        requirementsMap.get(p.requirement_id).publishedRecords.push(p);
      }
    });

    for (const [reqId, info] of requirementsMap.entries()) {
      const req = info.requirement;
      if (!req) continue;

      let totalTarget = 0;
      let totalActual = 0;
      let targetHasValue = false;
      let actualHasValue = false;

      const submissions = info.publishedRecords;
      submissions.forEach((sub) => {
        if (sub.standardized_target !== null && sub.standardized_target !== undefined) {
          totalTarget += sub.standardized_target;
          targetHasValue = true;
        }
        if (sub.standardized_actual !== null && sub.standardized_actual !== undefined) {
          totalActual += sub.standardized_actual;
          actualHasValue = true;
        }
      });

      const submittedRegionsCount = submissions.length;
      const isCompleteData = submittedRegionsCount >= info.assignedRegionsCount;

      const achievementRate =
        targetHasValue && totalTarget > 0
          ? Math.round((totalActual / totalTarget) * 1000) / 10
          : null;

      requirementSummaries.push({
        requirementId: req.requirement_id,
        code: req.code,
        title: req.title,
        category: req.category,
        expectedUnit: req.expected_unit,
        frequency: req.frequency,
        assignedRegionsCount: info.assignedRegionsCount,
        submittedRegionsCount,
        isCompleteData,
        dataCompletenessPercent:
          info.assignedRegionsCount > 0
            ? Math.round((submittedRegionsCount / info.assignedRegionsCount) * 100)
            : 0,
        nationalTotalTarget: targetHasValue ? Math.round(totalTarget * 100) / 100 : null,
        nationalTotalActual: actualHasValue ? Math.round(totalActual * 100) / 100 : null,
        achievementRate,
        submissions: submissions.map((s) => ({
          publishedRecordId: s.published_record_id,
          regionName: s.region?.name || "Unknown Region",
          localUnit: s.local_unit,
          reportedActual: s.reported_actual,
          standardizedActual: s.standardized_actual,
          achievementPercent: s.achievement_percent,
          publishedAt: s.published_at,
        })),
      });
    }

    return {
      filters: {
        reporting_year: currentYear,
        reporting_period_label: periodLabel,
      },
      kpis: {
        totalRequirementsCount,
        totalAssignmentsCount,
        totalAssignedRegionsCount,
        mappedAssignmentsCount: mappedCount,
        confirmedAssignmentsCount: confirmedCount,
        totalPublishedSubmissions,
        missingSubmissionsCount: Math.max(0, totalAssignmentsCount - totalPublishedSubmissions),
        overallNationalComplianceRate:
          totalAssignmentsCount > 0
            ? Math.round((totalPublishedSubmissions / totalAssignmentsCount) * 100)
            : 0,
      },
      regionalCompliance,
      requirementSummaries,
    };
  }
}

module.exports = new NationalReportingService();

