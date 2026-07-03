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
const { loadDepartmentPermissionGroups } = require("../utils/specialPermissionGroupUtils");
const { collectUserPermissionKeys } = require("../utils/userPermissionsUtils");
const { userCanApproveAchievement, userCanValidateAchievement } = require("../utils/planAchievementPermissionUtils");
const { buildVisibleGovernmentStructureIdSet } = require("../utils/structureScopeUtils");
const {
  userCanApproveLeafMasterNode,
  userCanAccessPlanSector,
  collectRootMasterNodeIds,
} = require("./planAchievementScopeUtils");
const { loadMasterPlanAssignments } = require("./planTreeVisibilityUtils");

async function loadUsersWithEffectivePermissions(userIds, transaction = null) {
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

  const enriched = [];
  for (const user of users) {
    const plain = user.toJSON ? user.toJSON() : user;
    plain.departmentPermissionGroups = await loadDepartmentPermissionGroups(
      plain.internal_structure_id,
      { transaction }
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

async function loadSectorApproverUsers(masterVersionId, transaction = null) {
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
    transaction
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
  transaction = null
) {
  const { users } = await loadSectorApproverUsers(masterVersionId, transaction);
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

async function loadSectorValidationUsers(masterVersionId, transaction = null) {
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
    transaction
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

module.exports = {
  loadUsersWithEffectivePermissions,
  collectCandidateApproverUserIds,
  loadSectorApproverUsers,
  loadSectorValidationUsers,
  assertUserCanValidateAchievement,
  resolveSectorApproverGateMasterNodeIds,
  resolveApproverUsersForLeafMasterNode,
};
