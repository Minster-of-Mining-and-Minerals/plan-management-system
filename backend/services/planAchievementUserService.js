"use strict";

const { Op } = require("sequelize");
const {
  User,
  Role,
  PermissionGroup,
  RolePermission,
  Permission,
  PlanVersion,
  GovernmentStructure,
  InternalStructure,
} = require("../models");
const {
  loadDepartmentPermissionGroups,
  loadDepartmentPermissionGroupsBatch,
} = require("../utils/specialPermissionGroupUtils");
const { collectUserPermissionKeys } = require("../utils/userPermissionsUtils");
const { userCanApproveAchievement, userCanValidateAchievement, userCanPublishSectorAggregation } = require("../utils/planAchievementPermissionUtils");
const { buildVisibleGovernmentStructureIdSet } = require("../utils/structureScopeUtils");
const {
  userCanApproveLeafMasterNode,
  userCanAccessPlanSector,
  collectRootMasterNodeIds,
} = require("./planAchievementScopeUtils");
const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");

async function loadUsersWithEffectivePermissions(
  userIds,
  transaction = null,
  options = {}
) {
  const uniqueIds = [...new Set((userIds ?? []).filter(Boolean))];
  if (!uniqueIds.length) {
    return [];
  }

  const users = await User.findAll({
    where: {
      user_id: { [Op.in]: uniqueIds },
      is_active: true,
    },
    attributes: { exclude: ["password"] },
    include: [
      {
        model: Role,
        as: "roles",
        through: { attributes: [] },
        include: [
          {
            model: RolePermission,
            as: "rolePermissions",
            include: [
              {
                model: Permission,
                as: "permission",
                attributes: ["resource", "action", "is_active"],
              },
            ],
          },
        ],
      },
      {
        model: PermissionGroup,
        as: "permissionGroups",
        through: { attributes: [] },
        include: [
          {
            model: Permission,
            as: "permissions",
            attributes: ["resource", "action", "is_active"],
            through: { attributes: [] },
          },
        ],
      },
    ],
    transaction,
  });

  const departmentCache =
    options.departmentGroupCache ||
    options.cache ||
    options.contextCache?.departmentGroupCache;

  const departmentIds = [
    ...new Set(users.map((u) => u.internal_structure_id).filter(Boolean)),
  ];

  const missingDepartmentIds = departmentCache
    ? departmentIds.filter((id) => !departmentCache.has(id))
    : departmentIds;

  let localDepartmentMap = new Map();
  if (missingDepartmentIds.length > 0) {
    localDepartmentMap = await loadDepartmentPermissionGroupsBatch(
      missingDepartmentIds,
      { transaction }
    );
    if (departmentCache) {
      for (const [id, groups] of localDepartmentMap.entries()) {
        departmentCache.set(id, groups);
      }
    }
  }

  const enriched = [];
  for (const user of users) {
    const plain = user.toJSON ? user.toJSON() : { ...user };
    let groups = [];
    if (plain.internal_structure_id) {
      if (departmentCache && departmentCache.has(plain.internal_structure_id)) {
        groups = departmentCache.get(plain.internal_structure_id) || [];
      } else if (localDepartmentMap.has(plain.internal_structure_id)) {
        groups = localDepartmentMap.get(plain.internal_structure_id) || [];
      } else {
        groups = await loadDepartmentPermissionGroups(
          plain.internal_structure_id,
          { transaction, cache: departmentCache }
        );
      }
    }
    plain.departmentPermissionGroups = groups.map((g) =>
      g && typeof g.toJSON === "function" ? g.toJSON() : { ...g }
    );
    plain.permissions = collectUserPermissionKeys(plain);
    enriched.push(plain);
  }

  return enriched;
}

async function collectCandidateApproverUserIds(internalAssignments, transaction = null) {
  const userIds = new Set();
  const departmentIds = new Set();

  for (const assignment of internalAssignments) {
    if (assignment.user_id) {
      userIds.add(assignment.user_id);
    }
    if (assignment.internal_structure_id) {
      departmentIds.add(assignment.internal_structure_id);
    }
  }

  if (departmentIds.size > 0) {
    const departmentUsers = await User.findAll({
      where: {
        internal_structure_id: { [Op.in]: [...departmentIds] },
        is_active: true,
      },
      attributes: ["user_id"],
      transaction,
    });

    for (const user of departmentUsers) {
      userIds.add(user.user_id);
    }
  }

  return [...userIds];
}

async function loadPlanSectorContext(masterVersionId, transaction = null) {
  const masterVersion = await PlanVersion.findByPk(masterVersionId, {
    attributes: ["government_structure_id"],
    transaction,
  });
  const planSectorId = masterVersion?.government_structure_id ?? null;
  if (!planSectorId) {
    return { planSectorId: null, structureIndex: [] };
  }

  const structureIndex = await GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
    transaction,
  });

  return { planSectorId, structureIndex };
}

async function loadSectorApproverUsers(
  masterVersionId,
  transaction = null,
  options = {}
) {
  const { planSectorId, structureIndex } = await loadPlanSectorContext(
    masterVersionId,
    transaction
  );
  if (!planSectorId) {
    return { planSectorId: null, structureIndex: [], users: [] };
  }

  const visibleFromPlan = buildVisibleGovernmentStructureIdSet(structureIndex, planSectorId);
  const sectorIds = [...visibleFromPlan];

  const users = await User.findAll({
    where: {
      is_active: true,
      [Op.or]: [
        { government_structure_id: { [Op.in]: sectorIds } },
        { government_structure_id: null },
      ],
    },
    attributes: ["user_id"],
    transaction,
  });

  const enriched = await loadUsersWithEffectivePermissions(
    users.map((user) => user.user_id),
    transaction,
    options
  );

  return {
    planSectorId,
    structureIndex,
    users: enriched.filter(
      (user) =>
        userCanApproveAchievement(user) &&
        userCanAccessPlanSector(user, planSectorId, structureIndex)
    ),
  };
}

async function resolveSectorApproverGateMasterNodeIds(
  masterVersionId,
  masterNodes,
  transaction = null,
  options = {}
) {
  const { users } = await loadSectorApproverUsers(masterVersionId, transaction, options);
  if (!users.length) {
    return new Set();
  }

  return new Set(collectRootMasterNodeIds(masterNodes));
}

async function resolveApproverUsersForLeafMasterNode(
  masterVersionId,
  leafMasterNodeId,
  transaction = null
) {
  if (!masterVersionId || !leafMasterNodeId) {
    return [];
  }

  const context = await loadMasterPlanAssignments(masterVersionId, transaction);
  const candidateUserIds = await collectCandidateApproverUserIds(
    context.internalAssignments,
    transaction
  );
  const { planSectorId, structureIndex, users: sectorApprovers } =
    await loadSectorApproverUsers(masterVersionId, transaction);
  const allCandidateIds = [
    ...new Set([
      ...candidateUserIds,
      ...sectorApprovers.map((user) => user.user_id),
    ]),
  ];
  const users = await loadUsersWithEffectivePermissions(allCandidateIds, transaction);
  const seen = new Set();
  const approvers = [];

  for (const user of users) {
    if (!userCanApproveAchievement(user) || seen.has(user.user_id)) {
      continue;
    }

    const assignmentScoped = userCanApproveLeafMasterNode(
      { user, ...context },
      leafMasterNodeId
    );
    const sectorScoped =
      planSectorId &&
      userCanAccessPlanSector(user, planSectorId, structureIndex);

    if (assignmentScoped || sectorScoped) {
      seen.add(user.user_id);
      approvers.push(user);
    }
  }

  return approvers;
}

async function loadSectorDepartmentIds(planSectorId, transaction = null) {
  const departments = await InternalStructure.findAll({
    where: { government_structure_id: planSectorId, is_active: true },
    attributes: ["internal_structure_id"],
    transaction,
  });

  return departments.map((row) => row.internal_structure_id);
}

async function loadSectorValidationUsers(
  masterVersionId,
  transaction = null,
  options = {}
) {
  const { planSectorId, structureIndex } = await loadPlanSectorContext(
    masterVersionId,
    transaction
  );
  if (!planSectorId) {
    return {
      planSectorId: null,
      structureIndex: [],
      users: [],
      hasValidationGate: false,
    };
  }

  const departmentIds = await loadSectorDepartmentIds(planSectorId, transaction);
  if (!departmentIds.length) {
    return {
      planSectorId,
      structureIndex: [],
      users: [],
      hasValidationGate: false,
    };
  }

  const departmentUsers = await User.findAll({
    where: {
      is_active: true,
      internal_structure_id: { [Op.in]: departmentIds },
    },
    attributes: ["user_id"],
    transaction,
  });

  const enriched = await loadUsersWithEffectivePermissions(
    departmentUsers.map((user) => user.user_id),
    transaction,
    options
  );

  const validators = enriched.filter(
    (user) =>
      userCanValidateAchievement(user) &&
      user.internal_structure_id &&
      departmentIds.includes(user.internal_structure_id) &&
      userCanAccessPlanSector(user, planSectorId, structureIndex)
  );

  return {
    planSectorId,
    structureIndex,
    users: validators,
    hasValidationGate: validators.length > 0,
  };
}

async function assertUserCanValidateAchievement(user, masterVersionId, transaction = null) {
  if (!userCanValidateAchievement(user)) {
    return {
      allowed: false,
      message: "Plan validate approval permission required",
    };
  }

  const { hasValidationGate, users, planSectorId } = await loadSectorValidationUsers(
    masterVersionId,
    transaction
  );

  if (!planSectorId) {
    return {
      allowed: false,
      message: "Approval validation applies to sector plans only",
    };
  }

  if (!hasValidationGate) {
    return {
      allowed: false,
      message: "No validation gate is configured for this sector plan",
    };
  }

  if (!users.some((candidate) => candidate.user_id === user.user_id)) {
    return {
      allowed: false,
      message:
        "You must belong to a department in this sector with validate approval permission",
    };
  }

  return { allowed: true };
}

/**
 * Structure→structure publish gate: one entry per active external assignment branch.
 * Gate is ON for a branch when ≥1 user in that sector subtree holds
 * plan:publish_sector_aggregation.
 */
async function loadSectorPublishGates(
  masterVersionId,
  transaction = null,
  options = {}
) {
  const { externalAssignments } = await loadMasterPlanAssignments(
    masterVersionId,
    transaction
  );
  const structureIndex = await GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
    transaction,
  });

  const activeBranches = (externalAssignments || []).filter(
    (assignment) => assignment.is_active !== false && assignment.government_structure_id
  );

  if (!activeBranches.length) {
    return {
      branches: [],
      hasSectorPublishGate: false,
      publishersByExternalAssignmentId: new Map(),
    };
  }

  const sectorIds = [
    ...new Set(activeBranches.map((assignment) => assignment.government_structure_id)),
  ];
  const candidateSectorIds = new Set();
  for (const sectorId of sectorIds) {
    for (const id of buildVisibleGovernmentStructureIdSet(structureIndex, sectorId)) {
      candidateSectorIds.add(id);
    }
  }

  const users = await User.findAll({
    where: {
      is_active: true,
      government_structure_id: { [Op.in]: [...candidateSectorIds] },
    },
    attributes: ["user_id"],
    transaction,
  });

  const enriched = await loadUsersWithEffectivePermissions(
    users.map((user) => user.user_id),
    transaction,
    options
  );

  const publishersByExternalAssignmentId = new Map();
  const branches = [];

  for (const assignment of activeBranches) {
    const branchSectorId = assignment.government_structure_id;
    const branchVisible = buildVisibleGovernmentStructureIdSet(
      structureIndex,
      branchSectorId
    );
    const publishers = enriched.filter(
      (user) =>
        userCanPublishSectorAggregation(user) &&
        user.government_structure_id &&
        branchVisible.has(user.government_structure_id)
    );

    publishersByExternalAssignmentId.set(
      assignment.external_assignment_id,
      publishers
    );

    branches.push({
      external_assignment_id: assignment.external_assignment_id,
      government_structure_id: branchSectorId,
      plan_node_id: assignment.plan_node_id,
      has_gate: publishers.length > 0,
      publisher_user_ids: publishers.map((user) => user.user_id),
    });
  }

  return {
    branches,
    hasSectorPublishGate: branches.some((branch) => branch.has_gate),
    publishersByExternalAssignmentId,
  };
}

async function assertUserCanPublishSectorAggregation(
  user,
  masterVersionId,
  externalAssignmentId,
  transaction = null
) {
  if (!userCanPublishSectorAggregation(user)) {
    return {
      allowed: false,
      message: "Plan publish sector aggregation permission required",
    };
  }

  const { branches, publishersByExternalAssignmentId } = await loadSectorPublishGates(
    masterVersionId,
    transaction
  );

  const branch = branches.find(
    (entry) => entry.external_assignment_id === externalAssignmentId
  );
  if (!branch) {
    return {
      allowed: false,
      message: "Sector branch assignment was not found on this plan",
    };
  }

  if (!branch.has_gate) {
    return {
      allowed: false,
      message: "No sector publish gate is configured for this sector branch",
    };
  }

  const publishers =
    publishersByExternalAssignmentId.get(externalAssignmentId) || [];
  if (!publishers.some((candidate) => candidate.user_id === user.user_id)) {
    return {
      allowed: false,
      message:
        "You must belong to this sector structure with publish sector aggregation permission",
    };
  }

  return { allowed: true, branch };
}

module.exports = {
  loadUsersWithEffectivePermissions,
  collectCandidateApproverUserIds,
  loadSectorApproverUsers,
  loadSectorValidationUsers,
  assertUserCanValidateAchievement,
  loadSectorPublishGates,
  assertUserCanPublishSectorAggregation,
  resolveSectorApproverGateMasterNodeIds,
  resolveApproverUsersForLeafMasterNode,
};
