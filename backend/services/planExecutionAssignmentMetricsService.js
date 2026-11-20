"use strict";

const { Op } = require("sequelize");
const {
  PlanNode,
  InternalAssignment,
  InternalStructure,
  User,
  Role,
} = require("../models");
const { computePeriodExecutionProgress } = require("./planExecutionRollupService");
const { buildMasterNodeIdByPeriodNodeId } = require("./planAchievementRollupService");
const { toLiveMasterNodeIdMap } = require("./planAchievementScopeService");
const { nodeContributesToRollup } = require("../utils/planAchievementRollupUtils");

function roundPercent(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function performanceLevel(percent) {
  if (percent == null) return "average";
  if (percent >= 85) return "excellent";
  if (percent >= 70) return "good";
  if (percent >= 50) return "average";
  return "at-risk";
}

function createAggregateBucket() {
  return {
    actualTotal: 0,
    targetTotal: 0,
    planIds: new Set(),
    nodeKeys: new Set(),
    reportedNodes: 0,
    userIds: new Set(),
    assignmentCount: 0,
  };
}

function applyContribution(bucket, contribution, meta = {}) {
  if (!contribution || contribution.target <= 0) return false;

  const nodeKey = meta.nodeKey;
  if (nodeKey && bucket.nodeKeys.has(nodeKey)) {
    return false;
  }

  if (nodeKey) {
    bucket.nodeKeys.add(nodeKey);
  }

  bucket.actualTotal += contribution.actual;
  bucket.targetTotal += contribution.target;
  bucket.assignmentCount += 1;

  if (meta.planId) {
    bucket.planIds.add(meta.planId);
  }
  if (meta.userId) {
    bucket.userIds.add(meta.userId);
  }
  if (meta.reported) {
    bucket.reportedNodes += 1;
  }

  return true;
}

/**
 * Achievement slice for a period node tied to an assignment.
 * Leaves use actual/target; rollup parents use their averaged achievement percent.
 */
function getAssignedNodeContribution(node, metrics, rollupContext = {}) {
  const directTarget = Number(node.period_target) || 0;
  const contributes = nodeContributesToRollup(node, rollupContext);

  if (directTarget > 0) {
    return {
      actual: contributes ? Number(node.period_actual) : 0,
      target: directTarget,
      reported: contributes,
    };
  }

  if (metrics?.is_evaluable && metrics.execution_progress_percent != null) {
    const percent = Number(metrics.execution_progress_percent) || 0;
    return {
      actual: percent,
      target: 100,
      reported: Boolean(metrics.has_contributing_data),
    };
  }

  return null;
}

function finalizeAggregateBucket(bucket) {
  const progress =
    bucket.targetTotal > 0
      ? roundPercent((bucket.actualTotal / bucket.targetTotal) * 100)
      : null;

  return {
    progress,
    has_progress: bucket.reportedNodes > 0,
    planCount: bucket.planIds.size,
    assignedNodeCount: bucket.nodeKeys.size,
    reportedNodeCount: bucket.reportedNodes,
    assignmentCount: bucket.assignmentCount,
    userIds: Array.from(bucket.userIds),
    reportingRate:
      bucket.nodeKeys.size > 0
        ? roundPercent((bucket.reportedNodes / bucket.nodeKeys.size) * 100)
        : null,
    performance: bucket.reportedNodes > 0 ? performanceLevel(progress) : "no-data",
    status:
      bucket.reportedNodes === 0
        ? "not_started"
        : progress != null && progress < 50
          ? "delayed"
          : "active",
  };
}

async function loadStructureNames(structureIds, transaction = null) {
  const ids = (structureIds || []).filter(Boolean);
  if (!ids.length) return new Map();
  const { GovernmentStructure } = require("../models");
  const rows = await GovernmentStructure.findAll({
    where: { government_structure_id: { [Op.in]: ids } },
    attributes: ["government_structure_id", "name", "parent_id"],
    transaction,
  });
  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter(Boolean))];
  const parents = parentIds.length
    ? await GovernmentStructure.findAll({
        where: { government_structure_id: { [Op.in]: parentIds } },
        attributes: ["government_structure_id", "name"],
        transaction,
      })
    : [];
  const parentName = new Map(parents.map((p) => [p.government_structure_id, p.name]));
  // Qualify with the parent when present so same-named sub-sectors are distinguishable.
  return new Map(
    rows.map((r) => [
      r.government_structure_id,
      r.parent_id && parentName.get(r.parent_id)
        ? `${r.name} (${parentName.get(r.parent_id)})`
        : r.name,
    ])
  );
}

async function buildAssignmentAchievementMetrics(focusContexts, options = {}) {
  const departmentBuckets = new Map();
  const userBuckets = new Map();
  const userMeta = new Map();

  for (const context of focusContexts) {
    const { liveMasterPlanId, periodVersionId, structureId } = context;

    // Dashboard periods come from the execution snapshot, whose nodes resolve to snapshot-master
    // ids; assignments live on the LIVE master, so translate before matching.
    const masterNodeIdByPeriodNodeId = await toLiveMasterNodeIdMap(
      await buildMasterNodeIdByPeriodNodeId(periodVersionId, options.transaction || null, options),
      options.transaction || null
    );
    const periodNodeIdByMasterNodeId = new Map();
    for (const [periodNodeId, masterNodeId] of masterNodeIdByPeriodNodeId) {
      periodNodeIdByMasterNodeId.set(masterNodeId, periodNodeId);
    }

    const cachedNodes = options.contextCache?.nodesByVersionId?.get(periodVersionId);
    const nodesPromise = cachedNodes
      ? Promise.resolve(cachedNodes)
      : PlanNode.findAll({
          where: { plan_version_id: periodVersionId, is_active: true },
          attributes: ["plan_node_id", "period_target", "period_actual", "period_actual_status"],
          transaction: options.transaction || null,
        });

    const cachedAssignments =
      options.contextCache?.internalAssignmentsByMasterId?.get(liveMasterPlanId);
    const assignmentsPromise = cachedAssignments
      ? Promise.resolve(cachedAssignments)
      : InternalAssignment.findAll({
          where: { is_active: true },
          transaction: options.transaction || null,
          include: [
            {
              model: PlanNode,
              as: "planNode",
              required: true,
              where: { plan_version_id: liveMasterPlanId },
              attributes: ["plan_node_id"],
            },
            {
              model: User,
              as: "user",
              required: false,
              attributes: [
                "user_id",
                "full_name",
                "email",
                "government_structure_id",
                "internal_structure_id",
              ],
              include: [
                {
                  model: Role,
                  as: "roles",
                  attributes: ["name"],
                  through: { attributes: [] },
                  required: false,
                },
              ],
            },
            {
              model: Role,
              as: "role",
              required: false,
              attributes: ["name"],
            },
          ],
        }).then((res) => {
          if (options.contextCache?.internalAssignmentsByMasterId) {
            options.contextCache.internalAssignmentsByMasterId.set(liveMasterPlanId, res);
          }
          return res;
        });

    const [nodes, assignments, progress] = await Promise.all([
      nodesPromise,
      assignmentsPromise,
      computePeriodExecutionProgress(periodVersionId, options.transaction || null, options),
    ]);

    const nodeById = new Map(
      nodes.map((node) => {
        const plain = node.toJSON ? node.toJSON() : node;
        return [plain.plan_node_id, plain];
      })
    );
    const rollupMap = progress.rollup_by_node_id ?? new Map();

    for (const assignment of assignments) {
      const masterPlanNodeId = assignment.plan_node_id ?? assignment.planNode?.plan_node_id;
      if (!masterPlanNodeId) continue;

      const periodNodeId = periodNodeIdByMasterNodeId.get(masterPlanNodeId);
      if (!periodNodeId) continue;

      const node = nodeById.get(periodNodeId);
      if (!node) continue;

      const metrics = rollupMap.get(periodNodeId);
      const contribution = getAssignedNodeContribution(
        node,
        metrics,
        progress.rollup_context
      );
      if (!contribution) continue;

      const nodeKey = `${periodVersionId}:${periodNodeId}`;
      const meta = {
        nodeKey,
        planId: liveMasterPlanId,
        reported: contribution.reported,
      };

      if (assignment.internal_structure_id) {
        const deptId = assignment.internal_structure_id;
        if (!departmentBuckets.has(deptId)) {
          departmentBuckets.set(deptId, createAggregateBucket());
        }
        applyContribution(departmentBuckets.get(deptId), contribution, meta);
      }

      if (assignment.user_id) {
        const userId = assignment.user_id;
        if (!userBuckets.has(userId)) {
          userBuckets.set(userId, createAggregateBucket());
        }
        const user = assignment.user;
        if (user && !userMeta.has(userId)) {
          const roleName =
            assignment.role?.name ?? user.roles?.[0]?.name ?? "Plan assignee";
          userMeta.set(userId, {
            id: userId,
            email: user.email ?? null,
            name: user.full_name?.trim() || user.email || "User",
            role: roleName,
            structureId: user.government_structure_id ?? structureId ?? null,
            departmentId:
              assignment.internal_structure_id ?? user.internal_structure_id ?? null,
          });
        }

        applyContribution(userBuckets.get(userId), contribution, {
          ...meta,
          userId,
        });

        const deptIdForUser =
          assignment.internal_structure_id ?? user?.internal_structure_id ?? null;
        if (deptIdForUser) {
          const deptId = deptIdForUser;
          if (!departmentBuckets.has(deptId)) {
            departmentBuckets.set(deptId, createAggregateBucket());
          }
          departmentBuckets.get(deptId).userIds.add(userId);
        }
      }
    }
  }

  return { departmentBuckets, userBuckets, userMeta };
}

async function buildDepartmentAndUserMetrics(focusContexts, structures, options = {}) {
  const { departmentBuckets, userBuckets, userMeta } =
    await buildAssignmentAchievementMetrics(focusContexts, options);

  const participatingDepartmentIds = new Set(departmentBuckets.keys());
  for (const meta of userMeta.values()) {
    if (meta.departmentId) participatingDepartmentIds.add(meta.departmentId);
  }

  const internalStructures = participatingDepartmentIds.size
    ? await InternalStructure.findAll({
        where: { internal_structure_id: { [Op.in]: [...participatingDepartmentIds] } },
        attributes: ["internal_structure_id", "name", "government_structure_id"],
        order: [["name", "ASC"]],
        transaction: options.transaction || null,
      })
    : [];
  const departmentById = new Map(internalStructures.map((d) => [d.internal_structure_id, d]));

  const structureIds = new Set(internalStructures.map((d) => d.government_structure_id));
  for (const meta of userMeta.values()) {
    if (meta.structureId) structureIds.add(meta.structureId);
  }
  const structureNameById = await loadStructureNames([...structureIds], options.transaction);

  const departments = internalStructures.map((dept) => {
    const bucket = departmentBuckets.get(dept.internal_structure_id) ?? createAggregateBucket();
    const finalized = finalizeAggregateBucket(bucket);

    return {
      id: dept.internal_structure_id,
      name: dept.name,
      structureId: dept.government_structure_id,
      structureName: structureNameById.get(dept.government_structure_id) ?? null,
      planCount: finalized.planCount,
      assignedNodeCount: finalized.assignedNodeCount,
      reportedNodeCount: finalized.reportedNodeCount,
      reportingRate: finalized.reportingRate,
      progress: finalized.progress ?? 0,
      has_progress: finalized.has_progress,
      status: finalized.status,
      performance: finalized.performance,
      userIds: finalized.userIds,
    };
  });

  const users = Array.from(userBuckets.entries())
    .map(([userId, bucket]) => {
      const meta = userMeta.get(userId) ?? {
        id: userId,
        name: "User",
        role: "Plan assignee",
        structureId: null,
        departmentId: null,
      };
      const finalized = finalizeAggregateBucket(bucket);

      return {
        id: meta.id,
        name: meta.name,
        email: meta.email ?? null,
        role: meta.role,
        structureId: meta.structureId,
        structureName: structureNameById.get(meta.structureId) ?? null,
        departmentId: meta.departmentId,
        departmentName: departmentById.get(meta.departmentId)?.name ?? null,
        planCount: finalized.planCount,
        assignedNodeCount: finalized.assignedNodeCount,
        reportedNodeCount: finalized.reportedNodeCount,
        reportingRate: finalized.reportingRate,
        achievementPercent: finalized.progress,
        has_progress: finalized.has_progress,
        performance: finalized.performance,
        activityScore: finalized.progress ?? 0,
      };
    })
    .sort((a, b) => (b.achievementPercent ?? -1) - (a.achievementPercent ?? -1));

  return { departments, users };
}

module.exports = {
  loadStructureNames,
  getAssignedNodeContribution,
  buildAssignmentAchievementMetrics,
  buildDepartmentAndUserMetrics,
  finalizeAggregateBucket,
  createAggregateBucket,
  applyContribution,
};
