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
    performance: performanceLevel(progress),
    status: progress != null && progress < 50 ? "delayed" : "active",
  };
}

async function buildAssignmentAchievementMetrics(focusContexts) {
  const departmentBuckets = new Map();
  const userBuckets = new Map();
  const userMeta = new Map();

  for (const context of focusContexts) {
    const { liveMasterPlanId, periodVersionId, structureId } = context;

    const masterNodeIdByPeriodNodeId = await buildMasterNodeIdByPeriodNodeId(periodVersionId);
    const periodNodeIdByMasterNodeId = new Map();
    for (const [periodNodeId, masterNodeId] of masterNodeIdByPeriodNodeId) {
      periodNodeIdByMasterNodeId.set(masterNodeId, periodNodeId);
    }

    const [nodes, assignments, progress] = await Promise.all([
      PlanNode.findAll({
        where: { plan_version_id: periodVersionId, is_active: true },
        attributes: ["plan_node_id", "period_target", "period_actual", "period_actual_status"],
      }),
      InternalAssignment.findAll({
        where: { is_active: true },
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
      }),
      computePeriodExecutionProgress(periodVersionId),
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
          
          if (!assignment.internal_structure_id) {
            applyContribution(departmentBuckets.get(deptId), contribution, meta);
          }
        }
      }
    }
  }

  return { departmentBuckets, userBuckets, userMeta };
}

async function buildDepartmentAndUserMetrics(focusContexts, structures) {
  const { departmentBuckets, userBuckets, userMeta } =
    await buildAssignmentAchievementMetrics(focusContexts);

  const internalStructures =
    structures.length > 0
      ? await InternalStructure.findAll({
          where: {
            government_structure_id: {
              [Op.in]: structures.map((structure) => structure.id),
            },
            is_active: true,
          },
          attributes: ["internal_structure_id", "name", "government_structure_id"],
          order: [["name", "ASC"]],
        })
      : [];

  const departments = internalStructures.map((dept) => {
    const bucket = departmentBuckets.get(dept.internal_structure_id) ?? createAggregateBucket();
    const finalized = finalizeAggregateBucket(bucket);

    return {
      id: dept.internal_structure_id,
      name: dept.name,
      structureId: dept.government_structure_id,
      planCount: finalized.planCount,
      assignedNodeCount: finalized.assignedNodeCount,
      reportedNodeCount: finalized.reportedNodeCount,
      progress: finalized.progress ?? 0,
      has_progress: finalized.has_progress,
      status: finalized.status,
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
        role: meta.role,
        structureId: meta.structureId,
        departmentId: meta.departmentId,
        assignedNodeCount: finalized.assignedNodeCount,
        reportedNodeCount: finalized.reportedNodeCount,
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
  getAssignedNodeContribution,
  buildAssignmentAchievementMetrics,
  buildDepartmentAndUserMetrics,
  finalizeAggregateBucket,
  createAggregateBucket,
  applyContribution,
};
