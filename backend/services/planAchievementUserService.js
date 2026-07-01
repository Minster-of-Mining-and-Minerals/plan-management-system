"use strict";

const { Op } = require("sequelize");
const {
  User,
  Role,
  PermissionGroup,
  RolePermission,
  Permission,
} = require("../models");
const { loadDepartmentPermissionGroups } = require("../utils/specialPermissionGroupUtils");
const { collectUserPermissionKeys } = require("../utils/userPermissionsUtils");
const { userCanApproveAchievement } = require("../utils/planAchievementPermissionUtils");
const { userCanApproveLeafMasterNode } = require("./planAchievementScopeUtils");
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
  const users = await loadUsersWithEffectivePermissions(candidateUserIds, transaction);

  return users.filter(
    (user) =>
      userCanApproveAchievement(user) &&
      userCanApproveLeafMasterNode({ user, ...context }, leafMasterNodeId)
  );
}

module.exports = {
  loadUsersWithEffectivePermissions,
  collectCandidateApproverUserIds,
  resolveApproverUsersForLeafMasterNode,
};
