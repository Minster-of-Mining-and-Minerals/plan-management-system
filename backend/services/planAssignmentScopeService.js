"use strict";

/**
 * Centralized plan assignment scope resolution.
 * All hierarchy filtering for Users / Departments / Roles must go through this service.
 */

const { Op } = require("sequelize");
const {
  PlanNode,
  PlanVersion,
  ExternalAssignment,
  InternalAssignment,
  GovernmentStructure,
  InternalStructure,
  User,
  Role,
  PermissionGroup,
  GovernmentStructurePermissionGroup,
} = require("../models");
const {
  ASSIGNMENT_TARGET_TYPE,
  ASSIGNMENT_SCOPE_TYPE,
} = require("../constants/planAssignmentScope");
const {
  ROLE_SCOPE,
  STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS,
} = require("../constants/systemRoles");

const ACTIVE_WHERE = { is_active: true };

async function getAncestorNodes(planNode, transaction) {
  const chain = [];
  let current = planNode;

  while (current.parent_id) {
    const parent = await PlanNode.findByPk(current.parent_id, { transaction });
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }

  return chain;
}

async function getActiveExternalAssignments(planNodeId, transaction) {
  return ExternalAssignment.findAll({
    where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
    order: [["created_at", "ASC"]],
    include: [{ model: GovernmentStructure, as: "governmentStructure" }],
    transaction,
  });
}

async function getPrimaryExternalAssignment(planNodeId, transaction, branchExternalAssignmentId = null) {
  if (branchExternalAssignmentId) {
    return ExternalAssignment.findOne({
      where: {
        external_assignment_id: branchExternalAssignmentId,
        plan_node_id: planNodeId,
        ...ACTIVE_WHERE,
      },
      include: [{ model: GovernmentStructure, as: "governmentStructure" }],
      transaction,
    });
  }

  return ExternalAssignment.findOne({
    where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
    order: [["created_at", "ASC"]],
    include: [{ model: GovernmentStructure, as: "governmentStructure" }],
    transaction,
  });
}

async function getPrimaryInternalAssignment(planNodeId, transaction, branchInternalAssignmentId = null) {
  const include = [
    { model: InternalStructure, as: "internalStructure" },
    { model: User, as: "user", attributes: { exclude: ["password"] } },
    { model: Role, as: "role" },
    { model: PermissionGroup, as: "permissionGroup" },
  ];

  if (branchInternalAssignmentId) {
    return InternalAssignment.findOne({
      where: {
        internal_assignment_id: branchInternalAssignmentId,
        plan_node_id: planNodeId,
        ...ACTIVE_WHERE,
      },
      include,
      transaction,
    });
  }

  return InternalAssignment.findOne({
    where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
    order: [["created_at", "ASC"]],
    include,
    transaction,
  });
}

async function resolveRootSectorId(ancestorChain, planVersion, transaction, branchContext = {}) {
  const levelOneNode =
    ancestorChain.find((n) => n.level === 1) ||
    ancestorChain[ancestorChain.length - 1] ||
    null;

  if (levelOneNode) {
    const external = await getPrimaryExternalAssignment(
      levelOneNode.plan_node_id,
      transaction,
      branchContext.branchExternalAssignmentId
    );
    if (external?.government_structure_id) {
      return external.government_structure_id;
    }
  }

  return planVersion.government_structure_id;
}

function mapParentAssignmentFromExternal(external) {
  return {
    type: ASSIGNMENT_TARGET_TYPE.SECTOR,
    assignmentTargetId: external.government_structure_id,
    government_structure_id: external.government_structure_id,
    label: external.governmentStructure?.name,
  };
}

function mapParentAssignmentFromInternal(internal) {
  if (internal.user_id) {
    return {
      type: ASSIGNMENT_TARGET_TYPE.USER,
      assignmentTargetId: internal.user_id,
      user_id: internal.user_id,
      government_structure_id: internal.user?.government_structure_id ?? null,
      internal_structure_id: internal.user?.internal_structure_id ?? null,
      label: internal.user?.full_name,
    };
  }

  if (internal.internal_structure_id) {
    return {
      type: ASSIGNMENT_TARGET_TYPE.DEPARTMENT,
      assignmentTargetId: internal.internal_structure_id,
      internal_structure_id: internal.internal_structure_id,
      government_structure_id:
        internal.internalStructure?.government_structure_id ?? null,
      label: internal.internalStructure?.name,
    };
  }

  if (internal.role_id) {
    return {
      type: ASSIGNMENT_TARGET_TYPE.ROLE,
      assignmentTargetId: internal.role_id,
      role_id: internal.role_id,
      government_structure_id: null,
      label: internal.role?.name,
    };
  }

  if (internal.permission_group_id) {
    return {
      type: ASSIGNMENT_TARGET_TYPE.PERMISSION_GROUP,
      assignmentTargetId: internal.permission_group_id,
      permission_group_id: internal.permission_group_id,
      government_structure_id: null,
      label: internal.permissionGroup?.name,
    };
  }

  return null;
}

async function resolveParentAssignmentRecord(parentNode, branchContext = {}, transaction = null) {
  if (!parentNode) return null;

  if (parentNode.level === 1 || !parentNode.parent_id) {
    const external = await getPrimaryExternalAssignment(
      parentNode.plan_node_id,
      transaction,
      branchContext.branchExternalAssignmentId
    );
    return external ? mapParentAssignmentFromExternal(external) : null;
  }

  const internal = await getPrimaryInternalAssignment(
    parentNode.plan_node_id,
    transaction,
    branchContext.branchInternalAssignmentId
  );
  return internal ? mapParentAssignmentFromInternal(internal) : null;
}

/**
 * Derive scope restrictions for assigning entities TO planNodeId (child of parent assignment).
 * Rules:
 * - Level 1: sector only
 * - Parent = sector → user/dept/role within sector (Rule implicit)
 * - Parent = user → full sector scope (Rule A)
 * - Parent = department → department subtree (Rule B)
 * - Parent = role → full sector scope (Rule C)
 */
async function resolveAssignmentScopeForNode(planNodeId, options = {}) {
  const { transaction = null, branchContext = {} } = options;

  const planNode = await PlanNode.findByPk(planNodeId, {
    include: [{ model: PlanVersion, as: "planVersion" }],
    transaction,
  });

  if (!planNode) {
    const error = new Error("Plan node not found");
    error.status = 404;
    throw error;
  }

  const planVersion = planNode.planVersion;
  const ancestorChain = await getAncestorNodes(planNode, transaction);
  const parent = ancestorChain[0] ?? null;
  const isRootLevel = planNode.level === 1 || !planNode.parent_id;
  const rootSectorId = await resolveRootSectorId(
    ancestorChain,
    planVersion,
    transaction,
    branchContext
  );

  if (isRootLevel) {
    return {
      plan_node_id: planNodeId,
      level: planNode.level,
      mode: "external",
      can_assign: true,
      root_sector_id: rootSectorId,
      scope_type: ASSIGNMENT_SCOPE_TYPE.SECTOR,
      scope_reference_id: rootSectorId,
      parent_assignment: null,
      allow_sector: true,
      allow_user: false,
      allow_department: false,
      allow_role: false,
      scope_label: null,
    };
  }

  const parentAssignment = await resolveParentAssignmentRecord(
    parent,
    branchContext,
    transaction
  );

  if (!parentAssignment) {
    return {
      plan_node_id: planNodeId,
      level: planNode.level,
      mode: "internal",
      can_assign: false,
      root_sector_id: rootSectorId,
      scope_type: null,
      scope_reference_id: null,
      parent_assignment: null,
      allow_sector: false,
      allow_user: false,
      allow_department: false,
      allow_role: false,
      scope_label: null,
      message: "Assign the parent plan level before assigning this level.",
    };
  }

  let scopeType = ASSIGNMENT_SCOPE_TYPE.SECTOR;
  let scopeReferenceId = rootSectorId;

  if (parentAssignment.type === ASSIGNMENT_TARGET_TYPE.DEPARTMENT) {
    scopeType = ASSIGNMENT_SCOPE_TYPE.DEPARTMENT_SUBTREE;
    scopeReferenceId = parentAssignment.internal_structure_id;
  }

  return {
    plan_node_id: planNodeId,
    level: planNode.level,
    mode: "internal",
    can_assign: true,
    root_sector_id: rootSectorId,
    scope_type: scopeType,
    scope_reference_id: scopeReferenceId,
    parent_assignment: parentAssignment,
    allow_sector: false,
    allow_user: true,
    allow_department: true,
    allow_role: true,
    scope_label: await formatAssignmentScopeLabel({
      rootSectorId: rootSectorId,
      parentAssignment,
      scopeType,
      scopeReferenceId,
      transaction,
    }),
    message: null,
  };
}

async function collectDepartmentSubtreeIds(rootDepartmentId, transaction) {
  const ids = new Set([rootDepartmentId]);
  const queue = [rootDepartmentId];

  while (queue.length) {
    const batch = queue.splice(0, queue.length);
    const children = await InternalStructure.findAll({
      where: { parent_id: { [Op.in]: batch }, is_active: true },
      attributes: ["internal_structure_id"],
      transaction,
    });

    for (const child of children) {
      if (!ids.has(child.internal_structure_id)) {
        ids.add(child.internal_structure_id);
        queue.push(child.internal_structure_id);
      }
    }
  }

  return ids;
}

async function getSectorLabel(sectorId, transaction) {
  if (!sectorId) return null;
  const sector = await GovernmentStructure.findByPk(sectorId, {
    attributes: ["name"],
    transaction,
  });
  return sector?.name ?? null;
}

async function getDepartmentLabel(departmentId, transaction) {
  if (!departmentId) return null;
  const dept = await InternalStructure.findByPk(departmentId, {
    attributes: ["name"],
    transaction,
  });
  return dept?.name ?? null;
}

async function formatAssignmentScopeLabel({
  rootSectorId,
  parentAssignment,
  scopeType,
  scopeReferenceId,
  transaction = null,
}) {
  const sectorName = await getSectorLabel(rootSectorId, transaction);
  const sectorLabel = sectorName || "Sector";

  if (!parentAssignment) {
    return sectorLabel;
  }

  if (parentAssignment.type === ASSIGNMENT_TARGET_TYPE.SECTOR) {
    return `${parentAssignment.label || sectorLabel}`;
  }

  if (parentAssignment.type === ASSIGNMENT_TARGET_TYPE.USER) {
    return `${sectorLabel} → ${parentAssignment.label || "User"}`;
  }

  if (parentAssignment.type === ASSIGNMENT_TARGET_TYPE.ROLE) {
    return `${sectorLabel} → ${parentAssignment.label || "Role"}`;
  }

  if (
    parentAssignment.type === ASSIGNMENT_TARGET_TYPE.DEPARTMENT ||
    scopeType === ASSIGNMENT_SCOPE_TYPE.DEPARTMENT_SUBTREE
  ) {
    const deptName =
      parentAssignment.label ||
      (await getDepartmentLabel(scopeReferenceId, transaction));
    return `${sectorLabel} → ${deptName || "Department"}`;
  }

  return sectorLabel;
}

function mapUserRow(user) {
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    government_structure_id: user.government_structure_id,
    internal_structure_id: user.internal_structure_id,
  };
}

function mapDepartmentRow(structure) {
  return {
    internal_structure_id: structure.internal_structure_id,
    name: structure.name,
    level: structure.level,
    parent_id: structure.parent_id,
    government_structure_id: structure.government_structure_id,
  };
}

function mapRoleRow(role) {
  return {
    role_id: role.role_id,
    name: role.name,
    scope: role.scope,
    government_structure_id: role.government_structure_id,
  };
}

function mapPermissionGroupRow(group) {
  const structureNames =
    group.structures?.map((structure) => structure.name).filter(Boolean) ?? [];

  return {
    permission_group_id: group.permission_group_id,
    name: group.name,
    description: group.description,
    structure_names: structureNames,
  };
}

async function getAvailablePermissionGroups(planNodeId, options = {}) {
  const scope = await resolveAssignmentScopeForNode(planNodeId, options);
  if (!scope.can_assign || !scope.allow_role || !scope.root_sector_id) {
    return { scope, permissionGroups: [] };
  }

  const { transaction = null } = options;
  const sectorIds = await collectDescendantSectorIds(scope.root_sector_id, transaction);

  const links = await GovernmentStructurePermissionGroup.findAll({
    where: { government_structure_id: { [Op.in]: [...sectorIds] } },
    attributes: ["permission_group_id"],
    transaction,
  });

  const groupIds = [...new Set(links.map((link) => link.permission_group_id))];
  if (groupIds.length === 0) {
    return { scope, permissionGroups: [] };
  }

  const groups = await PermissionGroup.findAll({
    where: {
      permission_group_id: { [Op.in]: groupIds },
      is_active: true,
    },
    include: [
      {
        model: GovernmentStructure,
        as: "structures",
        attributes: ["government_structure_id", "name"],
        through: { attributes: [] },
      },
    ],
    order: [["name", "ASC"]],
    transaction,
  });

  return { scope, permissionGroups: groups.map(mapPermissionGroupRow) };
}

async function getAvailableUsers(planNodeId, options = {}) {
  const scope = await resolveAssignmentScopeForNode(planNodeId, options);
  if (!scope.can_assign || !scope.allow_user) {
    return { scope, users: [] };
  }

  const { transaction = null } = options;
  const where = { is_active: true };

  if (scope.scope_type === ASSIGNMENT_SCOPE_TYPE.DEPARTMENT_SUBTREE) {
    const departmentIds = await collectDepartmentSubtreeIds(
      scope.scope_reference_id,
      transaction
    );
    where.internal_structure_id = { [Op.in]: [...departmentIds] };
  } else if (scope.root_sector_id) {
    where.government_structure_id = scope.root_sector_id;
  } else {
    return { scope, users: [] };
  }

  const users = await User.findAll({
    where,
    attributes: [
      "user_id",
      "full_name",
      "email",
      "government_structure_id",
      "internal_structure_id",
    ],
    order: [["full_name", "ASC"]],
    transaction,
  });

  return { scope, users: users.map(mapUserRow) };
}

async function getAvailableDepartments(planNodeId, options = {}) {
  const scope = await resolveAssignmentScopeForNode(planNodeId, options);
  if (!scope.can_assign || !scope.allow_department) {
    return { scope, departments: [] };
  }

  const { transaction = null } = options;

  if (scope.scope_type === ASSIGNMENT_SCOPE_TYPE.DEPARTMENT_SUBTREE) {
    const subtreeIds = await collectDepartmentSubtreeIds(
      scope.scope_reference_id,
      transaction
    );
    subtreeIds.delete(scope.scope_reference_id);

    if (subtreeIds.size === 0) {
      return { scope, departments: [] };
    }

    const departments = await InternalStructure.findAll({
      where: {
        internal_structure_id: { [Op.in]: [...subtreeIds] },
        is_active: true,
      },
      order: [
        ["level", "ASC"],
        ["name", "ASC"],
      ],
      transaction,
    });

    return { scope, departments: departments.map(mapDepartmentRow) };
  }

  if (!scope.root_sector_id) {
    return { scope, departments: [] };
  }

  const departments = await InternalStructure.findAll({
    where: {
      government_structure_id: scope.root_sector_id,
      is_active: true,
    },
    order: [
      ["level", "ASC"],
      ["name", "ASC"],
    ],
    transaction,
  });

  return { scope, departments: departments.map(mapDepartmentRow) };
}

async function getAvailableRoles(planNodeId, options = {}) {
  const scope = await resolveAssignmentScopeForNode(planNodeId, options);
  if (!scope.can_assign || !scope.allow_role || !scope.root_sector_id) {
    return { scope, roles: [] };
  }

  const { transaction = null } = options;
  const structureId = scope.root_sector_id;

  const structureRoles = await Role.findAll({
    where: {
      scope: ROLE_SCOPE.STRUCTURE,
      government_structure_id: structureId,
      is_active: true,
      deleted_at: null,
    },
    order: [["name", "ASC"]],
    transaction,
  });

  const globalRoles = await Role.findAll({
    where: {
      scope: ROLE_SCOPE.GLOBAL,
      role_id: { [Op.in]: [...STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS] },
      is_active: true,
      deleted_at: null,
    },
    order: [["name", "ASC"]],
    transaction,
  });

  const roles = [...structureRoles, ...globalRoles];
  return { scope, roles: roles.map(mapRoleRow) };
}

/**
 * Build assignment_context JSON to persist on a plan node after assignment.
 */
function buildAssignmentContext(scope, targetType, targetId, label = null) {
  return {
    rootSectorId: scope.root_sector_id,
    assignmentType: targetType,
    assignmentTargetId: targetId,
    scopeType: scope.scope_type,
    scopeReferenceId: scope.scope_reference_id,
    label,
  };
}

async function buildContextEntryForExternalAssignment(planNodeId, assignment, transaction) {
  const scope = await resolveAssignmentScopeForNode(planNodeId, { transaction });
  let label = assignment.governmentStructure?.name ?? null;

  if (!label) {
    const sector = await GovernmentStructure.findByPk(assignment.government_structure_id, {
      attributes: ["name"],
      transaction,
    });
    label = sector?.name ?? null;
  }

  return {
    ...buildAssignmentContext(
      scope,
      ASSIGNMENT_TARGET_TYPE.SECTOR,
      assignment.government_structure_id,
      label
    ),
    externalAssignmentId: assignment.external_assignment_id,
  };
}

async function buildContextEntryForInternalAssignment(planNodeId, assignment, transaction) {
  const branchContext = {
    branchExternalAssignmentId: assignment.branch_external_assignment_id,
    branchInternalAssignmentId: assignment.branch_internal_assignment_id,
  };
  const scope = await resolveAssignmentScopeForNode(planNodeId, {
    transaction,
    branchContext,
  });

  let targetType = null;
  let targetId = null;
  let label = null;

  if (assignment.user_id) {
    targetType = ASSIGNMENT_TARGET_TYPE.USER;
    targetId = assignment.user_id;
    label = assignment.user?.full_name ?? null;
  } else if (assignment.internal_structure_id) {
    targetType = ASSIGNMENT_TARGET_TYPE.DEPARTMENT;
    targetId = assignment.internal_structure_id;
    label = assignment.internalStructure?.name ?? null;
  } else if (assignment.role_id) {
    targetType = ASSIGNMENT_TARGET_TYPE.ROLE;
    targetId = assignment.role_id;
    label = assignment.role?.name ?? null;
  } else if (assignment.permission_group_id) {
    targetType = ASSIGNMENT_TARGET_TYPE.PERMISSION_GROUP;
    targetId = assignment.permission_group_id;
    label = assignment.permissionGroup?.name ?? null;
  }

  if (!targetType || !targetId) {
    return null;
  }

  return {
    ...buildAssignmentContext(scope, targetType, targetId, label),
    internalAssignmentId: assignment.internal_assignment_id,
    branchExternalAssignmentId: assignment.branch_external_assignment_id,
    branchInternalAssignmentId: assignment.branch_internal_assignment_id,
  };
}

/**
 * Rebuild plan_nodes.assignment_context from active assignments on the node.
 */
async function syncPlanNodeAssignmentContext(planNodeId, transaction = null) {
  const planNode = await PlanNode.findByPk(planNodeId, { transaction });
  if (!planNode) {
    const error = new Error("Plan node not found");
    error.status = 404;
    throw error;
  }

  const isRootLevel = planNode.level === 1 || !planNode.parent_id;
  const entries = [];

  if (isRootLevel) {
    const externalAssignments = await ExternalAssignment.findAll({
      where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
      order: [["created_at", "ASC"]],
      include: [{ model: GovernmentStructure, as: "governmentStructure" }],
      transaction,
    });

    for (const assignment of externalAssignments) {
      entries.push(
        await buildContextEntryForExternalAssignment(planNodeId, assignment, transaction)
      );
    }
  } else {
    const internalAssignments = await InternalAssignment.findAll({
      where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
      order: [["created_at", "ASC"]],
      include: [
        { model: InternalStructure, as: "internalStructure" },
        { model: User, as: "user", attributes: { exclude: ["password"] } },
        { model: Role, as: "role" },
        { model: PermissionGroup, as: "permissionGroup" },
      ],
      transaction,
    });

    for (const assignment of internalAssignments) {
      const entry = await buildContextEntryForInternalAssignment(
        planNodeId,
        assignment,
        transaction
      );
      if (entry) {
        entries.push(entry);
      }
    }
  }

  const assignment_context = entries.length > 0 ? { entries } : null;
  await planNode.update({ assignment_context }, { transaction });
  return assignment_context;
}

async function assertUserAssignable(planNodeId, userId, options = {}) {
  const { users } = await getAvailableUsers(planNodeId, options);
  if (!users.some((user) => user.user_id === userId)) {
    const error = new Error("Selected user is outside the allowed assignment scope.");
    error.status = 403;
    throw error;
  }
}

async function assertDepartmentAssignable(planNodeId, internalStructureId, options = {}) {
  const { departments } = await getAvailableDepartments(planNodeId, options);
  if (!departments.some((dept) => dept.internal_structure_id === internalStructureId)) {
    const error = new Error(
      "Selected department is outside the allowed assignment scope."
    );
    error.status = 403;
    throw error;
  }
}

async function assertRoleAssignable(planNodeId, roleId, options = {}) {
  const { roles } = await getAvailableRoles(planNodeId, options);
  if (!roles.some((role) => role.role_id === roleId)) {
    const error = new Error("Selected role is outside the allowed assignment scope.");
    error.status = 403;
    throw error;
  }
}

async function assertPermissionGroupAssignable(planNodeId, permissionGroupId, options = {}) {
  const { permissionGroups } = await getAvailablePermissionGroups(planNodeId, options);
  if (!permissionGroups.some((group) => group.permission_group_id === permissionGroupId)) {
    const error = new Error(
      "Selected permission group is outside the allowed assignment scope."
    );
    error.status = 403;
    throw error;
  }
}

async function assertSectorAssignable(planNodeId, governmentStructureId, options = {}) {
  const scope = await resolveAssignmentScopeForNode(planNodeId, options);
  if (!scope.allow_sector) {
    const error = new Error("Sector assignment is not allowed at this level.");
    error.status = 403;
    throw error;
  }

  const { transaction = null } = options;
  const allowed = await collectDescendantSectorIds(scope.root_sector_id, transaction);
  if (!allowed.has(governmentStructureId)) {
    const error = new Error("Selected sector is outside the allowed assignment scope.");
    error.status = 403;
    throw error;
  }
}

async function collectDescendantSectorIds(rootSectorId, transaction) {
  const ids = new Set([rootSectorId]);
  const queue = [rootSectorId];

  while (queue.length) {
    const batch = queue.splice(0, queue.length);
    const children = await GovernmentStructure.findAll({
      where: { parent_id: { [Op.in]: batch }, is_active: true },
      attributes: ["government_structure_id"],
      transaction,
    });
    for (const child of children) {
      if (!ids.has(child.government_structure_id)) {
        ids.add(child.government_structure_id);
        queue.push(child.government_structure_id);
      }
    }
  }

  return ids;
}

function mapSectorRow(structure) {
  return {
    government_structure_id: structure.government_structure_id,
    name: structure.name,
    level: structure.level,
    parent_id: structure.parent_id,
  };
}

function buildPropagationMessage(baseResponse) {
  if (!baseResponse.allow_propagate_all_branches) return null;
  const count =
    baseResponse.active_parent_branch_count ?? baseResponse.parent_branch_options.length;
  if (count <= 1) return null;
  return `Default: assignment will propagate to all ${count} active parent branches. Switch to a specific branch to assign to one branch only.`;
}

function buildBranchDuplicateWhere(planNodeId, branchFields, target) {
  const where = {
    plan_node_id: planNodeId,
    is_active: true,
    ...target,
  };

  if (branchFields.branch_external_assignment_id) {
    where.branch_external_assignment_id = branchFields.branch_external_assignment_id;
  }
  if (branchFields.branch_internal_assignment_id) {
    where.branch_internal_assignment_id = branchFields.branch_internal_assignment_id;
  }

  return where;
}

function mapParentContext(parentAssignment) {
  if (!parentAssignment) return null;

  return {
    type: parentAssignment.type,
    label: parentAssignment.label,
    government_structure_id: parentAssignment.government_structure_id ?? null,
    internal_structure_id: parentAssignment.internal_structure_id ?? undefined,
    user_id: parentAssignment.user_id ?? undefined,
    role_id: parentAssignment.role_id ?? undefined,
    permission_group_id: parentAssignment.permission_group_id ?? undefined,
  };
}

/**
 * Full assignment picker payload for a plan node (users, departments, roles, sectors).
 * Branch metadata is supplied by planAssignmentHierarchyService.
 */
async function getAssignmentOptionsForNode(
  planNodeId,
  transaction = null,
  branchContext = {},
  branchMetadata = {}
) {
  const planNode = await PlanNode.findByPk(planNodeId, {
    include: [{ model: PlanVersion, as: "planVersion" }],
    transaction,
  });

  if (!planNode) {
    const error = new Error("Plan node not found");
    error.status = 404;
    throw error;
  }

  const {
    parentBranchOptions = [],
    parentIsShared = false,
    supportsBranchSelection = false,
    allowPropagateAllBranches = false,
    effectiveBranchContext = branchContext,
  } = branchMetadata;

  const scopeOptions = { transaction, branchContext: effectiveBranchContext };
  const scope = await resolveAssignmentScopeForNode(planNodeId, scopeOptions);

  const baseResponse = {
    plan_node_id: planNodeId,
    level: planNode.level,
    assignment_sharing_mode: planNode.assignment_sharing_mode,
    parent_is_shared: parentIsShared,
    requires_branch_selection: false,
    supports_branch_selection: supportsBranchSelection,
    allow_propagate_all_branches: allowPropagateAllBranches,
    branch_assignment_mode: allowPropagateAllBranches ? "auto" : "controlled",
    parent_branch_options: parentBranchOptions,
    active_parent_branch_count: parentBranchOptions.length,
    scope_type: scope.scope_type,
    scope_reference_id: scope.scope_reference_id,
    scope_label: scope.scope_label,
    root_sector_id: scope.root_sector_id,
  };

  if (scope.mode === "external") {
    const allowedIds = await collectDescendantSectorIds(scope.root_sector_id, transaction);
    const sectors = await GovernmentStructure.findAll({
      where: {
        government_structure_id: { [Op.in]: [...allowedIds] },
        is_active: true,
      },
      order: [
        ["level", "ASC"],
        ["name", "ASC"],
      ],
      transaction,
    });

    const activeExternal = await ExternalAssignment.findAll({
      where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
      transaction,
    });

    return {
      ...baseResponse,
      assignment_mode: "external",
      can_assign: scope.can_assign,
      in_user_branch: false,
      allow_sector: scope.allow_sector,
      allow_department: false,
      allow_user: false,
      allow_role: false,
      parent_context: null,
      sectors: sectors.map(mapSectorRow),
      departments: [],
      users: [],
      roles: [],
      permission_groups: [],
      active_assignment_count: activeExternal.length,
      message: null,
    };
  }

  if (!scope.can_assign) {
    return {
      ...baseResponse,
      assignment_mode: "internal",
      can_assign: false,
      in_user_branch: false,
      allow_sector: false,
      allow_department: false,
      allow_user: false,
      allow_role: false,
      parent_context: null,
      sectors: [],
      departments: [],
      users: [],
      roles: [],
      permission_groups: [],
      active_assignment_count: 0,
      message: scope.message,
    };
  }

  const [{ users }, { departments }, { roles }, { permissionGroups }] = await Promise.all([
    getAvailableUsers(planNodeId, scopeOptions),
    getAvailableDepartments(planNodeId, scopeOptions),
    getAvailableRoles(planNodeId, scopeOptions),
    getAvailablePermissionGroups(planNodeId, scopeOptions),
  ]);

  const activeInternal = await InternalAssignment.findAll({
    where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
    transaction,
  });

  const parentContext = mapParentContext(scope.parent_assignment);
  const inUserBranch = scope.parent_assignment?.type === ASSIGNMENT_TARGET_TYPE.USER;
  const propagationMessage = buildPropagationMessage(baseResponse);

  return {
    ...baseResponse,
    assignment_mode: "internal",
    can_assign: true,
    in_user_branch: inUserBranch,
    allow_sector: false,
    allow_department: scope.allow_department && departments.length > 0,
    allow_user: scope.allow_user && users.length > 0,
    allow_role:
      scope.allow_role && (roles.length > 0 || permissionGroups.length > 0),
    parent_context: parentContext,
    sectors: [],
    departments,
    users,
    roles,
    permission_groups: permissionGroups,
    active_assignment_count: activeInternal.length,
    message: propagationMessage || scope.message,
  };
}

async function validateExternalAssignmentTarget(planNode, governmentStructureId, transaction) {
  const scope = await resolveAssignmentScopeForNode(planNode.plan_node_id, { transaction });

  if (scope.mode !== "external") {
    return "Root level plans must use sector assignment. Departments and users are not allowed at level 1.";
  }

  try {
    await assertSectorAssignable(planNode.plan_node_id, governmentStructureId, { transaction });
  } catch (error) {
    return error.message;
  }

  if (planNode.assignment_sharing_mode === "shared") {
    const duplicate = await ExternalAssignment.findOne({
      where: {
        plan_node_id: planNode.plan_node_id,
        government_structure_id: governmentStructureId,
        is_active: true,
      },
      transaction,
    });
    if (duplicate) {
      return "This sector is already actively assigned to this node.";
    }
  }

  return null;
}

async function validateInternalAssignmentTarget(
  planNode,
  { internal_structure_id, user_id, role_id, permission_group_id },
  transaction,
  branchContext = {},
  branchFields = null,
  options = {}
) {
  const { excludeAssignmentId = null } = options;
  const scope = await resolveAssignmentScopeForNode(planNode.plan_node_id, {
    transaction,
    branchContext,
  });

  if (!scope.can_assign) {
    return scope.message || "Assignment is not allowed at this level.";
  }

  if (scope.mode === "external") {
    return "Use sector assignment for root plan levels.";
  }

  const targets = [internal_structure_id, user_id, role_id, permission_group_id].filter(Boolean);
  if (targets.length !== 1) {
    return "Must assign to exactly one of department, user, role, or permission group.";
  }

  try {
    if (user_id) {
      await assertUserAssignable(planNode.plan_node_id, user_id, { transaction, branchContext });
    } else if (internal_structure_id) {
      await assertDepartmentAssignable(planNode.plan_node_id, internal_structure_id, {
        transaction,
        branchContext,
      });
    } else if (role_id) {
      await assertRoleAssignable(planNode.plan_node_id, role_id, { transaction, branchContext });
    } else if (permission_group_id) {
      await assertPermissionGroupAssignable(planNode.plan_node_id, permission_group_id, {
        transaction,
        branchContext,
      });
    }
  } catch (error) {
    return error.message;
  }

  const duplicateBranchFields = branchFields || {
    branch_external_assignment_id: branchContext.branchExternalAssignmentId || null,
    branch_internal_assignment_id: branchContext.branchInternalAssignmentId || null,
  };

  const duplicateTarget = user_id
    ? { user_id }
    : role_id
      ? { role_id }
      : permission_group_id
        ? { permission_group_id }
        : { internal_structure_id };

  const duplicate = await InternalAssignment.findOne({
    where: buildBranchDuplicateWhere(
      planNode.plan_node_id,
      duplicateBranchFields,
      duplicateTarget
    ),
    transaction,
  });

  if (duplicate && duplicate.internal_assignment_id !== excludeAssignmentId) {
    if (user_id) return "This user is already actively assigned on this branch.";
    if (role_id) return "This role is already actively assigned on this branch.";
    if (permission_group_id) {
      return "This permission group is already actively assigned on this branch.";
    }
    return "This department is already actively assigned on this branch.";
  }

  return null;
}

module.exports = {
  resolveAssignmentScopeForNode,
  getAssignmentOptionsForNode,
  getAvailableUsers,
  getAvailableDepartments,
  getAvailableRoles,
  getAvailablePermissionGroups,
  buildAssignmentContext,
  formatAssignmentScopeLabel,
  assertUserAssignable,
  assertDepartmentAssignable,
  assertRoleAssignable,
  assertPermissionGroupAssignable,
  assertSectorAssignable,
  validateExternalAssignmentTarget,
  validateInternalAssignmentTarget,
  syncPlanNodeAssignmentContext,
  buildContextEntryForExternalAssignment,
  buildContextEntryForInternalAssignment,
  collectDepartmentSubtreeIds,
  resolveParentAssignmentRecord,
};
