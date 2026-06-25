"use strict";

const {
    PlanVersion,
    PlanNode,
    PlanRule,
    PlanRuleStep,
    GovernmentStructure,
    ExternalAssignment,
    InternalAssignment,
    InternalStructure,
    User,
    Role,
    PermissionGroup,
    sequelize,
} = require("../../models");

const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const {
    buildDraftAlignedSortMeta,
    sortHierarchyTree,
    sortFlatPlanNodes,
    enrichPeriodNodesWithLiveAnnualTargets,
} = require("../../utils/planHierarchyUtils");
const {
    getNextSiblingOrder,
    propagateOrderFromMasterPlanNode,
    validateMasterPlanReorderNodes,
    syncAllDerivedOrdersFromMaster,
} = require("../../utils/planNodeOrderUtils");
const { isWeightModeSelectionLevel } = require("../../services/planRuleStepUtils");
const {
    getAssignedMasterNodeIds,
    getAssignedReviewMasterVersionIds,
} = require("../../services/planReviewVisibilityService");
const {
    resolveAccessibleMasterPlanIds,
    loadGovernmentStructureIndex,
    getVisibleNodeIdsForVersion,
    filterFlatPlanNodesByVisibility,
    filterNestedPlanNodes,
    filterHierarchyNodes,
    resolvePlanAccessRolesForMasters,
} = require("../../services/planVisibilityService");
const {
    resolveManageableStructureId,
    sendScopeError,
} = require("../../utils/structureScopeUtils");
const {
    enrichLiveMasterReviewFields,
} = require("../../services/planReviewSnapshotService");
const {
    attachExecutionSnapshotContext,
} = require("../../services/planExecutionGateService");
const {
    getEffectivePlanningConfigForStructure,
    computePlanningPeriodEnd,
    validatePlanningStartDate,
    validatePlanningDuration,
    validateYearRange,
    validateNodeTargetUnit,
    resolvePeriodLabels,
} = require("../../services/planningConfigurationService");
const {
    propagateMasterPlanNodeCreate,
    propagateMasterPlanNodeUpdate,
    propagateMasterPlanNodeDelete,
    shouldPropagateMasterStructureChanges,
} = require("../../services/planMasterEditService");
const {
    validateCanEditMasterPlanStructure,
    validatePlanLifecyclePermission,
    PLAN_LIFECYCLE_PERMISSIONS,
} = require("../../utils/planMasterEditUtils");
const { validatePlanNodeAgainstRule } = require("../../services/planRuleService");
const {
    assertPlanRuleApplicableToSector,
} = require("../../utils/planRuleApplicabilityUtils");
const {
    completeAnnualVersion,
    completeExecutionPeriod,
    copyNodesAndAssignments,
} = require("../../services/planVersionLifecycleService");

async function validateTargetUnitForNode({
    planVersionId,
    nodeLevel,
    weight,
    weightMode,
    targetUnit,
    parentNode,
    transaction,
}) {
    const [planVersion, planningConfig] = await Promise.all([
        PlanVersion.findByPk(planVersionId, {
            include: [
                {
                    model: PlanRule,
                    as: "planRule",
                    include: [{ model: PlanRuleStep, as: "steps" }],
                },
            ],
            transaction,
        }),
        PlanVersion.findByPk(planVersionId, {
            attributes: ["government_structure_id"],
            transaction,
        }).then((version) =>
            getEffectivePlanningConfigForStructure(
                version?.government_structure_id ?? null,
                transaction
            )
        ),
    ]);

    const isSelectionLevel = isWeightModeSelectionLevel(planVersion?.planRule, nodeLevel);
    const requiresWeight = weight > 0 && weightMode;

    return validateNodeTargetUnit({
        weightMode,
        targetUnit,
        weight,
        requiresWeight,
        parent: parentNode,
        isSelectionLevel,
        configUnits: planningConfig.target_units,
    });
}

function isMasterDraft(planVersion) {
    return planVersion.version_kind === "master" && planVersion.status === "draft";
}

function resolvePlanningStartDate(body) {
    if (body.planning_start_date) {
        return body.planning_start_date;
    }
    if (body.start_year) {
        return `${body.start_year}-01-01`;
    }
    if (body.year) {
        return `${body.year}-01-01`;
    }
    return null;
}

/**
 * =================== PLAN VERSION CRUD ===================
 */

// Create new plan version (plan draft)
const createPlanVersion = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            draft_name,
            planning_duration_years,
            government_structure_id,
            based_on_version_id,
            plan_rule_id,
        } = req.body;

        const config = await getEffectivePlanningConfigForStructure(
            government_structure_id,
            t
        );

        const planningStartDate = resolvePlanningStartDate(req.body);
        const startDateError = validatePlanningStartDate(planningStartDate);
        if (startDateError) {
            await t.rollback();
            return res.status(400).json({ success: false, message: startDateError });
        }

        const durationYears = planning_duration_years;

        const durationError = validatePlanningDuration(durationYears, config);
        if (durationError) {
            await t.rollback();
            return res.status(400).json({ success: false, message: durationError });
        }

        const period = computePlanningPeriodEnd(planningStartDate, durationYears);
        const rangeError = validateYearRange(period.start_year, period.end_year, period.end_month);
        if (rangeError) {
            await t.rollback();
            return res.status(400).json({ success: false, message: rangeError });
        }

        const govStructure = await GovernmentStructure.findByPk(government_structure_id, {
            transaction: t,
        });
        if (!govStructure) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: "Government structure not found",
            });
        }

        try {
            const structureIndex = await loadGovernmentStructureIndex();
            resolveManageableStructureId(req, government_structure_id, structureIndex);
        } catch (error) {
            await t.rollback();
            return sendScopeError(res, error);
        }

        const latestVersion = await PlanVersion.findOne({
            where: {
                start_year: period.start_year,
                government_structure_id,
                version_kind: "master",
            },
            order: [["version_number", "DESC"]],
            transaction: t,
        });

        const version_number = latestVersion ? latestVersion.version_number + 1 : 1;

        if (based_on_version_id) {
            const baseVersion = await PlanVersion.findByPk(based_on_version_id, { transaction: t });
            if (!baseVersion) {
                await t.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Base plan draft not found",
                });
            }
        }

        if (plan_rule_id) {
            const structureIndex = await loadGovernmentStructureIndex();
            const selectedRule = await PlanRule.findByPk(plan_rule_id, { transaction: t });
            try {
                assertPlanRuleApplicableToSector(
                    selectedRule,
                    government_structure_id,
                    structureIndex
                );
            } catch (error) {
                await t.rollback();
                return res.status(error.status || 400).json({
                    success: false,
                    message: error.message,
                });
            }
        }

        const planVersion = await PlanVersion.create(
            {
                plan_version_id: uuidv4(),
                draft_name,
                planning_start_date: planningStartDate,
                planning_end_date: period.planning_end_date,
                start_year: period.start_year,
                start_month: period.start_month,
                end_year: period.end_year,
                end_month: period.end_month,
                planning_duration_years: durationYears,
                year: period.start_year,
                version_number,
                version_kind: "master",
                status: "draft",
                government_structure_id,
                based_on_version_id: based_on_version_id || null,
                plan_rule_id: plan_rule_id || null,
            },
            { transaction: t }
        );

        if (based_on_version_id) {
            await copyNodesFromVersion(based_on_version_id, planVersion.plan_version_id, t);
        }

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Plan draft created successfully",
            data: planVersion,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function to copy nodes from another version (carry-forward drafts)
async function copyNodesFromVersion(sourceVersionId, targetVersionId, transaction) {
    await copyNodesAndAssignments(sourceVersionId, targetVersionId, transaction);
}

// Get all plan versions with filters
const getPlanVersions = async (req, res) => {
    try {
        const { year, government_structure_id, status, search, version_kind, parent_plan_version_id } = req.query;

        const where = {};

        if (year) where.year = parseInt(year);
        if (government_structure_id) where.government_structure_id = government_structure_id;
        if (status) where.status = status;
        if (version_kind) where.version_kind = version_kind;
        if (parent_plan_version_id) where.parent_plan_version_id = parent_plan_version_id;
        where.review_snapshot_of_version_id = null;
        where.execution_snapshot_of_version_id = null;

        const accessibleMasterIds = await resolveAccessibleMasterPlanIds(req);
        if (accessibleMasterIds !== null) {
            if (accessibleMasterIds.length === 0) {
                return res.json({ success: true, data: [] });
            }
            where.plan_version_id = { [Op.in]: accessibleMasterIds };
        }

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            where[Op.or] = [
                { draft_name: { [Op.iLike]: term } },
                sequelize.where(
                    sequelize.cast(sequelize.col("start_year"), "varchar"),
                    { [Op.iLike]: term }
                ),
                sequelize.where(
                    sequelize.cast(sequelize.col("end_year"), "varchar"),
                    { [Op.iLike]: term }
                ),
            ];
        }

        const versions = await PlanVersion.findAll({
            where,
            include: [
                {
                    model: GovernmentStructure,
                    as: "governmentStructure",
                },
                {
                    model: PlanVersion,
                    as: "baseVersion",
                },
                {
                    model: PlanNode,
                    as: "planNodes",
                    required: false,
                    attributes: ["plan_node_id", "title", "type", "level"],
                },
            ],
            order: [["start_year", "DESC"], ["version_number", "DESC"]],
        });

        const accessRoles = await resolvePlanAccessRolesForMasters(
            req,
            versions.map((version) => version.plan_version_id)
        );

        return res.json({
            success: true,
            data: versions.map((version) => ({
                ...(typeof version.get === "function"
                    ? version.get({ plain: true })
                    : version.toJSON()),
                access_role: accessRoles.get(version.plan_version_id) || "owner",
            })),
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const REVIEW_LIST_STATUSES = [
    "under_review",
    "review_completed",
    "corrections_unlocked",
];

// Master plans published for review (assigned sections only for reviewers without full read)
const getPlanVersionsForReview = async (req, res) => {
    try {
        const { search } = req.query;

        const where = {
            version_kind: "master",
            review_snapshot_of_version_id: null,
            active_review_snapshot_id: { [Op.ne]: null },
            published_for_review_at: { [Op.ne]: null },
            review_status: { [Op.in]: REVIEW_LIST_STATUSES },
        };

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            where[Op.and] = [
                {
                    [Op.or]: [
                        { draft_name: { [Op.iLike]: term } },
                        sequelize.where(
                            sequelize.cast(sequelize.col("start_year"), "varchar"),
                            { [Op.iLike]: term }
                        ),
                        sequelize.where(
                            sequelize.cast(sequelize.col("end_year"), "varchar"),
                            { [Op.iLike]: term }
                        ),
                    ],
                },
            ];
        }

        const publishedMasters = await PlanVersion.findAll({
            where,
            attributes: [
                "plan_version_id",
                "version_number",
                "draft_name",
                "active_review_snapshot_id",
                "published_for_review_at",
                "review_status",
                "review_completed_at",
                "review_unlocked_at",
            ],
            order: [["published_for_review_at", "DESC"], ["start_year", "DESC"]],
        });

        const liveReviewBySnapshotId = new Map();
        for (const master of publishedMasters) {
            if (!master.active_review_snapshot_id) continue;
            liveReviewBySnapshotId.set(master.active_review_snapshot_id, {
                live_master_version_id: master.plan_version_id,
                live_master_version_number: master.version_number,
                live_master_draft_name: master.draft_name,
                review_status: master.review_status,
                published_for_review_at: master.published_for_review_at,
                review_completed_at: master.review_completed_at,
                review_unlocked_at: master.review_unlocked_at,
                active_review_snapshot_id: master.active_review_snapshot_id,
            });
        }

        const accessibleSnapshotIds = [];
        for (const master of publishedMasters) {
            if (!master.active_review_snapshot_id) continue;
            const assigned = await getAssignedMasterNodeIds(
                master.active_review_snapshot_id,
                req.user.user_id
            );
            if (assigned.size > 0) {
                accessibleSnapshotIds.push(master.active_review_snapshot_id);
            }
        }

        if (accessibleSnapshotIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const versions = await PlanVersion.findAll({
            where: {
                plan_version_id: { [Op.in]: accessibleSnapshotIds },
            },
            include: [
                {
                    model: GovernmentStructure,
                    as: "governmentStructure",
                },
                {
                    model: PlanVersion,
                    as: "baseVersion",
                },
            ],
        });

        const enriched = versions
            .map((version) => {
                const plain = version.toJSON();
                const liveReview = liveReviewBySnapshotId.get(plain.plan_version_id);
                return liveReview ? { ...plain, ...liveReview } : plain;
            })
            .sort((a, b) => {
                const aTime = a.published_for_review_at
                    ? new Date(a.published_for_review_at).getTime()
                    : 0;
                const bTime = b.published_for_review_at
                    ? new Date(b.published_for_review_at).getTime()
                    : 0;
                if (bTime !== aTime) return bTime - aTime;
                return (b.start_year ?? 0) - (a.start_year ?? 0);
            });

        return res.json({
            success: true,
            data: enriched,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get plan version by ID
const getPlanVersionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const planVersion = await PlanVersion.findByPk(id, {
            include: [
                {
                    model: GovernmentStructure,
                    as: "governmentStructure",
                },
                {
                    model: PlanVersion,
                    as: "baseVersion",
                },
                {
                    model: PlanVersion,
                    as: "annualVersions",
                    separate: true,
                    order: [["sequence_index", "ASC"]],
                },
                {
                    model: PlanVersion,
                    as: "executionPeriodVersions",
                    separate: true,
                    order: [["sequence_index", "ASC"]],
                },
                {
                    model: PlanRule,
                    as: "planRule",
                    include: [
                        {
                            model: PlanRuleStep,
                            as: "steps",
                            separate: true,
                            order: [["step_order", "ASC"]],
                        },
                    ],
                },
                {
                    model: PlanNode,
                    as: "planNodes",
                    include: [
                        {
                            model: PlanNode,
                            as: "children",
                        },
                        {
                            model: PlanNode,
                            as: "parent",
                        },
                    ],
                },
            ],
        });

        if (!planVersion) {
            return res.status(404).json({ message: "Plan version not found" });
        }

        const enriched = await enrichLiveMasterReviewFields(planVersion);
        const withExecution = await attachExecutionSnapshotContext(enriched);
        const visibleNodeIds = await getVisibleNodeIdsForVersion(req, id);

        if (withExecution?.planNodes) {
            withExecution.planNodes = filterNestedPlanNodes(withExecution.planNodes, visibleNodeIds);
        }

        return res.json({
            success: true,
            data: withExecution,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update plan version
const updatePlanVersion = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planVersion = await PlanVersion.findByPk(id, { transaction: t });

        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        if (!isMasterDraft(planVersion)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot update a finalized or annual plan version metadata",
            });
        }

        const body = { ...req.body };
        delete body.end_year;

        const targetStructureId =
            body.government_structure_id ?? planVersion.government_structure_id;
        const config = await getEffectivePlanningConfigForStructure(targetStructureId, t);

        const updates = { ...body };

        const planningStartDate =
            updates.planning_start_date ??
            (updates.start_year !== undefined
                ? `${updates.start_year}-01-01`
                : planVersion.planning_start_date);
        const durationYears =
            updates.planning_duration_years ?? planVersion.planning_duration_years;

        if (
            updates.planning_start_date !== undefined ||
            updates.start_year !== undefined ||
            updates.planning_duration_years !== undefined
        ) {
            const startDateError = validatePlanningStartDate(planningStartDate);
            if (startDateError) {
                await t.rollback();
                return res.status(400).json({ success: false, message: startDateError });
            }

            const durationError = validatePlanningDuration(durationYears, config);
            if (durationError) {
                await t.rollback();
                return res.status(400).json({ success: false, message: durationError });
            }

            const period = computePlanningPeriodEnd(planningStartDate, durationYears);
            const rangeError = validateYearRange(
                period.start_year,
                period.end_year,
                period.end_month
            );
            if (rangeError) {
                await t.rollback();
                return res.status(400).json({ success: false, message: rangeError });
            }

            updates.planning_start_date = planningStartDate;
            updates.planning_end_date = period.planning_end_date;
            updates.start_year = period.start_year;
            updates.start_month = period.start_month;
            updates.end_year = period.end_year;
            updates.end_month = period.end_month;
            updates.planning_duration_years = durationYears;
            updates.year = period.start_year;
        }

        if (updates.plan_rule_id) {
            const structureIndex = await loadGovernmentStructureIndex();
            const selectedRule = await PlanRule.findByPk(updates.plan_rule_id, {
                transaction: t,
            });
            try {
                assertPlanRuleApplicableToSector(
                    selectedRule,
                    targetStructureId,
                    structureIndex
                );
            } catch (error) {
                await t.rollback();
                return res.status(error.status || 400).json({
                    success: false,
                    message: error.message,
                });
            }
        }

        await planVersion.update(updates, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: "Plan version updated",
            data: planVersion,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete (soft) plan version
const deletePlanVersion = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planVersion = await PlanVersion.findByPk(id, { transaction: t });

        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        // Check if this version is being used as base for another version
        const dependentVersions = await PlanVersion.count({
            where: { based_on_version_id: id },
            transaction: t,
        });

        if (dependentVersions > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete version that is used as base for other versions",
            });
        }

        await planVersion.destroy({ transaction: t });

        await t.commit();

        return res.json({ message: "Plan version deleted successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Change plan version status
const updatePlanVersionStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planVersion = await PlanVersion.findByPk(id, { transaction: t });

        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        if (planVersion.version_kind === "annual" && status === "completed") {
            const access = validatePlanLifecyclePermission(
                req.user,
                PLAN_LIFECYCLE_PERMISSIONS.COMPLETE_ANNUAL,
                "Complete Annual Plan"
            );
            if (!access.valid) {
                await t.rollback();
                return res.status(403).json({ success: false, message: access.message });
            }
            await t.rollback();
            const result = await completeAnnualVersion(id);
            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }
            return res.json({
                success: true,
                message: result.unlockedVersion
                    ? `Annual version completed. Year ${result.unlockedVersion.sequence_index} is now available.`
                    : "Annual version completed",
                data: result.data,
                unlockedVersion: result.unlockedVersion,
            });
        }

        if (planVersion.version_kind === "execution_period" && status === "completed") {
            const access = validatePlanLifecyclePermission(
                req.user,
                PLAN_LIFECYCLE_PERMISSIONS.COMPLETE_PERIOD,
                "Complete Execution Period"
            );
            if (!access.valid) {
                await t.rollback();
                return res.status(403).json({ success: false, message: access.message });
            }
            await t.rollback();
            const result = await completeExecutionPeriod(id);
            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }
            return res.json({
                success: true,
                message: result.unlockedVersion
                    ? `${result.unlockedVersion.period_label} is now available for execution.`
                    : "Execution period completed",
                data: result.data,
                unlockedVersion: result.unlockedVersion,
            });
        }

        const validTransitions = {
            draft: ["active"],
            active: ["completed"],
            completed: [],
            finalized: [],
            locked: [],
        };

        if (!validTransitions[planVersion.status].includes(status)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Invalid status transition from ${planVersion.status} to ${status}`,
            });
        }

        await planVersion.update({ status }, { transaction: t });

        await t.commit();

        return res.json({
            success: true,
            message: `Plan version status updated to ${status}`,
            data: planVersion,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

/**
 * =================== PLAN NODE CRUD ===================
 */

// Create plan node
const createPlanNode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            plan_version_id,
            parent_id,
            type,
            title,
            description,
            weight,
            weight_mode,
            target_unit,
            level,
            assignment_sharing_mode,
        } = req.body;

        // Verify plan version exists and is draft
        const planVersion = await PlanVersion.findByPk(plan_version_id, { transaction: t });
        if (!planVersion) {
            await t.rollback();
            return res.status(404).json({ message: "Plan version not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        let parentNode = null;
        if (parent_id) {
            parentNode = await PlanNode.findOne({
                where: {
                    plan_node_id: parent_id,
                    plan_version_id,
                },
                transaction: t,
            });

            if (!parentNode) {
                await t.rollback();
                return res.status(404).json({ message: "Parent node not found in this version" });
            }
        }

        // Calculate level if not provided
        let nodeLevel = level;
        if (!nodeLevel && parentNode) {
            nodeLevel = parentNode.level + 1;
        } else if (!nodeLevel) {
            nodeLevel = 1;
        }

        const ruleCheck = await validatePlanNodeAgainstRule({
            planVersionId: plan_version_id,
            parentId: parent_id || null,
            type,
            weight: weight || 0,
            weightMode: weight_mode || null,
            level: nodeLevel,
            transaction: t,
        });

        if (!ruleCheck.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: ruleCheck.message,
            });
        }

        const unitCheck = await validateTargetUnitForNode({
            planVersionId: plan_version_id,
            nodeLevel,
            weight: weight || 0,
            weightMode: ruleCheck.weightMode,
            targetUnit: target_unit,
            parentNode,
            transaction: t,
        });

        if (!unitCheck.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: unitCheck.message,
            });
        }

        const nodeOrder = await getNextSiblingOrder(
            plan_version_id,
            parent_id || null,
            t
        );

        const planNode = await PlanNode.create(
            {
                plan_node_id: uuidv4(),
                plan_version_id,
                parent_id: parent_id || null,
                type: ruleCheck.nodeType || type,
                title,
                description,
                weight: weight || 0,
                weight_mode: ruleCheck.weightMode || null,
                target_unit: unitCheck.targetUnit,
                level: nodeLevel,
                order: nodeOrder,
                is_active: true,
                assignment_sharing_mode: assignment_sharing_mode || "exclusive",
            },
            { transaction: t }
        );

        if (await shouldPropagateMasterStructureChanges(planVersion, t)) {
            await propagateMasterPlanNodeCreate(planNode, t);
        }

        await t.commit();

        return res.status(201).json({
            success: true,
            message: "Plan node created",
            data: planNode,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get all plan nodes for a version
const getPlanNodes = async (req, res) => {
    try {
        const { plan_version_id, type, parent_id, level, is_active } = req.query;

        const where = {};
        if (plan_version_id) where.plan_version_id = plan_version_id;
        if (type) where.type = type;
        if (parent_id !== undefined) where.parent_id = parent_id || null;
        if (level) where.level = parseInt(level);
        if (is_active !== undefined) where.is_active = is_active === "true";

        const nodes = await PlanNode.findAll({
            where,
            include: [
                {
                    model: PlanVersion,
                    as: "planVersion",
                },
                {
                    model: PlanNode,
                    as: "parent",
                },
                {
                    model: PlanNode,
                    as: "children",
                },
            ],
            order: [["order", "ASC"], ["created_at", "ASC"]],
        });

        let data = nodes.map((node) => node.toJSON());

        if (plan_version_id) {
            const planVersion = await PlanVersion.findByPk(plan_version_id, {
                attributes: ["plan_version_id", "version_kind", "parent_plan_version_id"],
            });
            const visibleNodeIds = await getVisibleNodeIdsForVersion(req, plan_version_id);
            data = filterFlatPlanNodesByVisibility(data, visibleNodeIds);

            if (planVersion && planVersion.version_kind !== "master") {
                const sortMetaByNodeId = await buildDraftAlignedSortMeta(planVersion, nodes);
                data = sortFlatPlanNodes(planVersion, data, sortMetaByNodeId);
            }
        }

        return res.json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Get plan node by ID
const getPlanNodeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const planNode = await PlanNode.findByPk(id, {
            include: [
                {
                    model: PlanVersion,
                    as: "planVersion",
                },
                {
                    model: PlanNode,
                    as: "parent",
                },
                {
                    model: PlanNode,
                    as: "children",
                },
            ],
        });

        if (!planNode) {
            return res.status(404).json({ message: "Plan node not found" });
        }

        const nodeJson = planNode.toJSON();
        if (
            planNode.planVersion?.version_kind === "execution_period" &&
            planNode.source_plan_node_id &&
            planNode.planVersion.parent_plan_version_id
        ) {
            const annualNode = await PlanNode.findOne({
                where: {
                    plan_node_id: planNode.source_plan_node_id,
                    plan_version_id: planNode.planVersion.parent_plan_version_id,
                },
                attributes: ["annual_target"],
            });
            if (annualNode) {
                nodeJson.annual_target = annualNode.annual_target;
            }
        }

        return res.json({
            success: true,
            data: nodeJson,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Update plan node
const updatePlanNode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planNode = await PlanNode.findByPk(id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        const nextType = req.body.type !== undefined ? req.body.type : planNode.type;
        const nextWeight = req.body.weight !== undefined ? req.body.weight : planNode.weight;
        const nextParentId =
            req.body.parent_id !== undefined ? req.body.parent_id : planNode.parent_id;

        let nextLevel = planNode.level;
        if (req.body.level !== undefined) {
            nextLevel = req.body.level;
        } else if (req.body.parent_id !== undefined && nextParentId) {
            const parentNode = await PlanNode.findByPk(nextParentId, { transaction: t });
            if (!parentNode) {
                await t.rollback();
                return res.status(404).json({ message: "Parent node not found in this version" });
            }
            nextLevel = parentNode.level + 1;
        } else if (req.body.parent_id !== undefined && !nextParentId) {
            nextLevel = 1;
        }

        const nextWeightMode =
            req.body.weight_mode !== undefined ? req.body.weight_mode : planNode.weight_mode;
        const nextTargetUnit =
            req.body.target_unit !== undefined ? req.body.target_unit : planNode.target_unit;

        let parentForRule = null;
        if (nextParentId) {
            parentForRule = await PlanNode.findOne({
                where: {
                    plan_node_id: nextParentId,
                    plan_version_id: planNode.plan_version_id,
                },
                transaction: t,
            });
        }

        const ruleCheck = await validatePlanNodeAgainstRule({
            planVersionId: planNode.plan_version_id,
            parentId: nextParentId,
            type: nextType,
            weight: nextWeight || 0,
            weightMode: nextWeightMode,
            level: nextLevel,
            excludeNodeId: planNode.plan_node_id,
            transaction: t,
        });

        if (!ruleCheck.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: ruleCheck.message,
            });
        }

        const unitCheck = await validateTargetUnitForNode({
            planVersionId: planNode.plan_version_id,
            nodeLevel: nextLevel,
            weight: nextWeight || 0,
            weightMode: ruleCheck.weightMode,
            targetUnit: nextTargetUnit,
            parentNode: parentForRule,
            transaction: t,
        });

        if (!unitCheck.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: unitCheck.message,
            });
        }

        if (
            req.body.assignment_sharing_mode !== undefined &&
            req.body.assignment_sharing_mode !== planNode.assignment_sharing_mode
        ) {
            const activeExternal = await ExternalAssignment.count({
                where: { plan_node_id: id, is_active: true },
                transaction: t,
            });
            const activeInternal = await InternalAssignment.count({
                where: { plan_node_id: id, is_active: true },
                transaction: t,
            });

            if (activeExternal + activeInternal > 1) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message:
                        "Cannot change assignment mode while multiple active assignments exist. Remove or deactivate assignments first.",
                });
            }
        }

        const { order: _ignoredOrder, ...updateFields } = req.body;

        await planNode.update(
            {
                ...updateFields,
                level: nextLevel,
                weight_mode: ruleCheck.weightMode || null,
                target_unit: unitCheck.targetUnit,
            },
            { transaction: t }
        );

        if (await shouldPropagateMasterStructureChanges(planNode.planVersion, t)) {
            await propagateMasterPlanNodeUpdate(planNode, t);
        }

        await t.commit();

        return res.json({
            success: true,
            message: "Plan node updated",
            data: planNode,
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Delete plan node
const deletePlanNode = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        if (!isUuid(id)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid ID" });
        }

        const planNode = await PlanNode.findByPk(id, {
            include: [{ model: PlanVersion, as: "planVersion" }],
            transaction: t,
        });

        if (!planNode) {
            await t.rollback();
            return res.status(404).json({ message: "Plan node not found" });
        }

        const structureAccess = validateCanEditMasterPlanStructure(planNode.planVersion, req.user);
        if (!structureAccess.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: structureAccess.message,
            });
        }

        // Check if node has children
        const childrenCount = await PlanNode.count({
            where: { parent_id: id },
            transaction: t,
        });

        if (childrenCount > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Cannot delete node with children. Delete children first or reassign.",
            });
        }

        if (await shouldPropagateMasterStructureChanges(planNode.planVersion, t)) {
            await propagateMasterPlanNodeDelete(id, t);
        }

        await planNode.destroy({ transaction: t });

        await t.commit();

        return res.json({ message: "Plan node deleted successfully" });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

// Get plan hierarchy tree
const getPlanHierarchy = async (req, res) => {
    try {
        const { plan_version_id } = req.params;

        if (!isUuid(plan_version_id)) {
            return res.status(400).json({ message: "Invalid version ID format" });
        }

        const nodes = await PlanNode.findAll({
            where: { plan_version_id, is_active: true },
            order: [["order", "ASC"], ["created_at", "ASC"]],
        });

        const nodeIds = nodes.map((node) => node.plan_node_id);

        const [externalAssignments, internalAssignments] = await Promise.all([
            nodeIds.length
                ? ExternalAssignment.findAll({
                      where: {
                          plan_node_id: { [Op.in]: nodeIds },
                          is_active: true,
                      },
                      include: [
                          {
                              model: GovernmentStructure,
                              as: "governmentStructure",
                              attributes: ["government_structure_id", "name"],
                          },
                      ],
                  })
                : [],
            nodeIds.length
                ? InternalAssignment.findAll({
                      where: {
                          plan_node_id: { [Op.in]: nodeIds },
                          is_active: true,
                      },
                      include: [
                          {
                              model: InternalStructure,
                              as: "internalStructure",
                              attributes: ["internal_structure_id", "name"],
                          },
                          {
                              model: User,
                              as: "user",
                              attributes: ["user_id", "full_name"],
                          },
                          {
                              model: Role,
                              as: "role",
                              attributes: ["role_id", "name"],
                          },
                          {
                              model: PermissionGroup,
                              as: "permissionGroup",
                              attributes: ["permission_group_id", "name"],
                          },
                      ],
                  })
                : [],
        ]);

        const externalByNode = new Map();
        for (const assignment of externalAssignments) {
            const list = externalByNode.get(assignment.plan_node_id) ?? [];
            list.push(assignment.toJSON());
            externalByNode.set(assignment.plan_node_id, list);
        }

        const internalByNode = new Map();
        for (const assignment of internalAssignments) {
            const list = internalByNode.get(assignment.plan_node_id) ?? [];
            list.push(assignment.toJSON());
            internalByNode.set(assignment.plan_node_id, list);
        }

        // Build tree structure
        const nodeMap = new Map();
        const roots = [];

        nodes.forEach((node) => {
            nodeMap.set(node.plan_node_id, {
                ...node.toJSON(),
                children: [],
                externalAssignments: externalByNode.get(node.plan_node_id) ?? [],
                internalAssignments: internalByNode.get(node.plan_node_id) ?? [],
            });
        });

        nodes.forEach(node => {
            const nodeWithChildren = nodeMap.get(node.plan_node_id);
            if (node.parent_id && nodeMap.has(node.parent_id)) {
                nodeMap.get(node.parent_id).children.push(nodeWithChildren);
            } else {
                roots.push(nodeWithChildren);
            }
        });

        const planVersion = await PlanVersion.findByPk(plan_version_id, {
            attributes: ["plan_version_id", "version_kind", "parent_plan_version_id"],
        });
        await enrichPeriodNodesWithLiveAnnualTargets(planVersion, nodeMap, nodes);
        const sortMetaByNodeId = await buildDraftAlignedSortMeta(planVersion, nodes);
        let sortedRoots = sortHierarchyTree(roots, sortMetaByNodeId);

        const visibleNodeIds = await getVisibleNodeIdsForVersion(req, plan_version_id);
        if (visibleNodeIds) {
            sortedRoots = filterHierarchyNodes(sortedRoots, visibleNodeIds);
        }

        return res.json({
            success: true,
            data: sortedRoots,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Reorder nodes (draft master only — derived versions inherit the same order)
const reorderPlanNodes = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { parent_id, nodeOrders } = req.body;

        const validation = await validateMasterPlanReorderNodes(nodeOrders, parent_id, req.user, t);
        if (!validation.valid) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: validation.message,
            });
        }

        for (const item of nodeOrders) {
            await PlanNode.update(
                { order: item.order },
                {
                    where: { plan_node_id: item.plan_node_id, parent_id: parent_id || null },
                    transaction: t,
                }
            );
            await propagateOrderFromMasterPlanNode(item.plan_node_id, item.order, t);
        }

        await syncAllDerivedOrdersFromMaster(validation.masterVersionId, t);

        await t.commit();

        return res.json({
            success: true,
            message: "Nodes reordered successfully",
        });
    } catch (error) {
        await t.rollback();
        return res.status(500).json({ error: error.message });
    }
};

module.exports = {
    // Plan Version
    createPlanVersion,
    getPlanVersions,
    getPlanVersionsForReview,
    getPlanVersionById,
    updatePlanVersion,
    deletePlanVersion,
    updatePlanVersionStatus,

    // Plan Node
    createPlanNode,
    getPlanNodes,
    getPlanNodeById,
    updatePlanNode,
    deletePlanNode,
    getPlanHierarchy,
    reorderPlanNodes,
};