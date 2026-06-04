"use strict";

const {
  PlanNode,
  PlanVersion,
  ExternalAssignment,
  InternalAssignment,
  GovernmentStructure,
  InternalStructure,
  User,
} = require("../models");
const { Op } = require("sequelize");

const ACTIVE_WHERE = { is_active: true };

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

async function getActiveInternalAssignments(planNodeId, transaction) {
  return InternalAssignment.findAll({
    where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
    order: [["created_at", "ASC"]],
    include: [
      { model: InternalStructure, as: "internalStructure" },
      { model: User, as: "user", attributes: { exclude: ["password"] } },
    ],
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
  if (branchInternalAssignmentId) {
    return InternalAssignment.findOne({
      where: {
        internal_assignment_id: branchInternalAssignmentId,
        plan_node_id: planNodeId,
        ...ACTIVE_WHERE,
      },
      include: [
        { model: InternalStructure, as: "internalStructure" },
        { model: User, as: "user", attributes: { exclude: ["password"] } },
      ],
      transaction,
    });
  }

  return InternalAssignment.findOne({
    where: { plan_node_id: planNodeId, ...ACTIVE_WHERE },
    order: [["created_at", "ASC"]],
    include: [
      { model: InternalStructure, as: "internalStructure" },
      { model: User, as: "user", attributes: { exclude: ["password"] } },
    ],
    transaction,
  });
}

function mapExternalBranchOption(assignment) {
  return {
    external_assignment_id: assignment.external_assignment_id,
    label: assignment.governmentStructure?.name,
    government_structure_id: assignment.government_structure_id,
  };
}

function mapInternalBranchOption(assignment) {
  return {
    internal_assignment_id: assignment.internal_assignment_id,
    label: assignment.user?.full_name || assignment.internalStructure?.name,
    type: assignment.user_id ? "user" : "department",
    user_id: assignment.user_id,
    internal_structure_id: assignment.internal_structure_id,
  };
}

async function getParentBranchOptions(parentNode, transaction) {
  if (!parentNode) return [];

  if (parentNode.level === 1 || !parentNode.parent_id) {
    const active = await getActiveExternalAssignments(parentNode.plan_node_id, transaction);
    if (parentNode.assignment_sharing_mode === "shared" && active.length > 1) {
      return active.map(mapExternalBranchOption);
    }
    return [];
  }

  const active = await getActiveInternalAssignments(parentNode.plan_node_id, transaction);
  if (parentNode.assignment_sharing_mode === "shared" && active.length > 1) {
    return active.map(mapInternalBranchOption);
  }

  return [];
}

async function resolveRootSectorId(ancestorChain, planVersion, transaction, branchExternalAssignmentId = null) {
  const levelOneNode =
    ancestorChain.find((n) => n.level === 1) ||
    ancestorChain[ancestorChain.length - 1] ||
    null;

  if (levelOneNode) {
    const external = await getPrimaryExternalAssignment(
      levelOneNode.plan_node_id,
      transaction,
      branchExternalAssignmentId
    );
    if (external?.government_structure_id) {
      return external.government_structure_id;
    }
  }

  return planVersion.government_structure_id;
}

async function isInUserBranch(ancestorChain, transaction, branchContext = {}) {
  if (branchContext.branchInternalAssignmentId) {
    let currentId = branchContext.branchInternalAssignmentId;
    while (currentId) {
      const assignment = await InternalAssignment.findOne({
        where: { internal_assignment_id: currentId, ...ACTIVE_WHERE },
        include: [{ model: User, as: "user", attributes: { exclude: ["password"] } }],
        transaction,
      });
      if (!assignment) break;
      if (assignment.user_id) return true;
      currentId = assignment.branch_internal_assignment_id;
    }
    return false;
  }

  if (branchContext.branchExternalAssignmentId) {
    for (const ancestor of ancestorChain) {
      const internal = await InternalAssignment.findOne({
        where: {
          plan_node_id: ancestor.plan_node_id,
          branch_external_assignment_id: branchContext.branchExternalAssignmentId,
          ...ACTIVE_WHERE,
        },
        order: [["created_at", "DESC"]],
        include: [{ model: User, as: "user", attributes: { exclude: ["password"] } }],
        transaction,
      });
      if (internal?.user_id) return true;
    }
    return false;
  }

  for (const ancestor of ancestorChain) {
    const assignments = await getActiveInternalAssignments(ancestor.plan_node_id, transaction);
    if (assignments.some((a) => a.user_id)) return true;
  }
  return false;
}

async function resolveUserBranchDepartmentId(branchContext, transaction) {
  if (!branchContext.branchInternalAssignmentId) return null;

  let currentId = branchContext.branchInternalAssignmentId;
  while (currentId) {
    const assignment = await InternalAssignment.findOne({
      where: { internal_assignment_id: currentId, ...ACTIVE_WHERE },
      include: [{ model: InternalStructure, as: "internalStructure" }],
      transaction,
    });
    if (!assignment) break;
    if (assignment.internal_structure_id) return assignment.internal_structure_id;
    currentId = assignment.branch_internal_assignment_id;
  }
  return null;
}

async function resolveParentAssignmentContext(parentNode, transaction, branchContext = {}) {
  if (!parentNode) return null;

  if (parentNode.level === 1 || !parentNode.parent_id) {
    const external = await getPrimaryExternalAssignment(
      parentNode.plan_node_id,
      transaction,
      branchContext.branchExternalAssignmentId
    );
    if (!external) return null;
    return {
      type: "sector",
      government_structure_id: external.government_structure_id,
      label: external.governmentStructure?.name,
    };
  }

  const internal = await getPrimaryInternalAssignment(
    parentNode.plan_node_id,
    transaction,
    branchContext.branchInternalAssignmentId
  );
  if (!internal) return null;

  if (internal.user_id) {
    return {
      type: "user",
      user_id: internal.user_id,
      government_structure_id: internal.user?.government_structure_id ?? null,
      label: internal.user?.full_name,
    };
  }

  if (internal.internal_structure_id) {
    return {
      type: "department",
      internal_structure_id: internal.internal_structure_id,
      government_structure_id:
        internal.internalStructure?.government_structure_id ?? null,
      label: internal.internalStructure?.name,
    };
  }

  return null;
}

function mapSectorOptions(structures) {
  return structures.map((s) => ({
    government_structure_id: s.government_structure_id,
    name: s.name,
    level: s.level,
    parent_id: s.parent_id,
  }));
}

function mapDepartmentOptions(structures) {
  return structures.map((s) => ({
    internal_structure_id: s.internal_structure_id,
    name: s.name,
    level: s.level,
    parent_id: s.parent_id,
    government_structure_id: s.government_structure_id,
  }));
}

function mapUserOptions(users) {
  return users.map((u) => ({
    user_id: u.user_id,
    full_name: u.full_name,
    email: u.email,
    government_structure_id: u.government_structure_id,
    internal_structure_id: u.internal_structure_id,
  }));
}

async function resolveBranchFieldsForCreate(
  planNode,
  parentNode,
  branchInput,
  transaction
) {
  const propagateAll = branchInput.propagate_all_branches === true;
  const allBranches = await resolveAllParentBranchContexts(parentNode, transaction);

  if (allBranches.error) {
    return { error: allBranches.error };
  }

  if (allBranches.length === 0) {
    return { branch_external_assignment_id: null, branch_internal_assignment_id: null };
  }

  if (allBranches.length === 1) {
    return allBranches[0];
  }

  // Parent is shared with multiple active branches
  if (branchInput.branch_external_assignment_id || branchInput.branch_internal_assignment_id) {
    const selected = allBranches.find(
      (branch) =>
        (branchInput.branch_external_assignment_id &&
          branch.branch_external_assignment_id === branchInput.branch_external_assignment_id) ||
        (branchInput.branch_internal_assignment_id &&
          branch.branch_internal_assignment_id === branchInput.branch_internal_assignment_id)
    );
    if (!selected) {
      return { error: "Selected parent assignment branch is not valid." };
    }
    return selected;
  }

  if (propagateAll && planNode.assignment_sharing_mode === "shared") {
    return { branches: allBranches };
  }

  // Exclusive child under shared parent: single branch (first active branch)
  return allBranches[0];
}

async function resolveAllParentBranchContexts(parentNode, transaction) {
  if (!parentNode) {
    return [];
  }

  const parentIsRoot = parentNode.level === 1 || !parentNode.parent_id;

  if (parentIsRoot) {
    const activeExternal = await getActiveExternalAssignments(parentNode.plan_node_id, transaction);
    if (activeExternal.length === 0) {
      return { error: "Assign the parent plan level before assigning this level." };
    }

    return activeExternal.map((assignment) => ({
      branch_external_assignment_id: assignment.external_assignment_id,
      branch_internal_assignment_id: null,
      label: assignment.governmentStructure?.name,
    }));
  }

  const activeInternal = await getActiveInternalAssignments(parentNode.plan_node_id, transaction);
  if (activeInternal.length === 0) {
    return { error: "Assign the parent plan level before assigning this level." };
  }

  return activeInternal.map((assignment) => ({
    branch_external_assignment_id: assignment.branch_external_assignment_id,
    branch_internal_assignment_id: assignment.internal_assignment_id,
    label: assignment.user?.full_name || assignment.internalStructure?.name,
  }));
}

async function getDefaultBranchContext(parentNode, transaction) {
  const branches = await resolveAllParentBranchContexts(parentNode, transaction);
  if (branches.error) return null;
  if (branches.length === 0) return null;
  return {
    branchExternalAssignmentId: branches[0].branch_external_assignment_id,
    branchInternalAssignmentId: branches[0].branch_internal_assignment_id,
  };
}

async function deactivateActiveAssignmentsForNode(planNodeId, assignmentType, transaction) {
  if (assignmentType === "external") {
    await ExternalAssignment.update(
      { is_active: false },
      { where: { plan_node_id: planNodeId, is_active: true }, transaction }
    );
    return;
  }

  await InternalAssignment.update(
    { is_active: false },
    { where: { plan_node_id: planNodeId, is_active: true }, transaction }
  );
}

async function getAssignmentOptionsForNode(planNodeId, transaction = null, branchContext = {}) {
  const planNode = await PlanNode.findByPk(planNodeId, {
    include: [{ model: PlanVersion, as: "planVersion" }],
    transaction,
  });

  if (!planNode) {
    const err = new Error("Plan node not found");
    err.status = 404;
    throw err;
  }

  const planVersion = planNode.planVersion;
  const ancestorChain = await getAncestorNodes(planNode, transaction);
  const parent = ancestorChain[0] ?? null;
  const isRootLevel = planNode.level === 1 || !planNode.parent_id;

  const parentBranchOptions = await getParentBranchOptions(parent, transaction);
  const parentIsShared = parent?.assignment_sharing_mode === "shared";
  const hasMultipleBranches = parentBranchOptions.length > 1;
  const supportsBranchSelection = hasMultipleBranches;
  const allowPropagateAllBranches =
    hasMultipleBranches && planNode.assignment_sharing_mode === "shared";

  let effectiveBranchContext = { ...branchContext };
  if (
    hasMultipleBranches &&
    !branchContext.branchExternalAssignmentId &&
    !branchContext.branchInternalAssignmentId &&
    parent
  ) {
    const defaultBranch = await getDefaultBranchContext(parent, transaction);
    if (defaultBranch) {
      effectiveBranchContext = defaultBranch;
    }
  }

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
  };

  if (isRootLevel) {
    const allowedIds = await collectDescendantSectorIds(
      planVersion.government_structure_id,
      transaction
    );
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

    const activeExternal = await getActiveExternalAssignments(planNodeId, transaction);

    return {
      ...baseResponse,
      assignment_mode: "external",
      can_assign: true,
      in_user_branch: false,
      allow_sector: true,
      allow_department: false,
      allow_user: false,
      parent_context: null,
      sectors: mapSectorOptions(sectors),
      departments: [],
      users: [],
      active_assignment_count: activeExternal.length,
      message: null,
    };
  }

  const userBranch = await isInUserBranch(ancestorChain, transaction, effectiveBranchContext);
  const sectorContextId = await resolveRootSectorId(
    ancestorChain,
    planVersion,
    transaction,
    effectiveBranchContext.branchExternalAssignmentId
  );

  if (userBranch) {
    const userWhere = {
      is_active: true,
    };

    const branchDepartmentId = await resolveUserBranchDepartmentId(effectiveBranchContext, transaction);
    if (branchDepartmentId) {
      userWhere.internal_structure_id = branchDepartmentId;
    } else if (sectorContextId) {
      userWhere.government_structure_id = sectorContextId;
    }

    const users = await User.findAll({
      where: userWhere,
      attributes: ["user_id", "full_name", "email", "government_structure_id", "internal_structure_id"],
      order: [["full_name", "ASC"]],
      transaction,
    });

    const activeInternal = await getActiveInternalAssignments(planNodeId, transaction);

    return {
      ...baseResponse,
      assignment_mode: "internal",
      can_assign: true,
      in_user_branch: true,
      allow_sector: false,
      allow_department: false,
      allow_user: true,
      parent_context: await resolveParentAssignmentContext(parent, transaction, effectiveBranchContext),
      sectors: [],
      departments: [],
      users: mapUserOptions(users),
      active_assignment_count: activeInternal.length,
      message:
        "This branch is assigned to a user. Only user assignments are allowed at deeper levels.",
    };
  }

  const parentContext = await resolveParentAssignmentContext(parent, transaction, effectiveBranchContext);
  if (!parentContext) {
    return {
      ...baseResponse,
      assignment_mode: "internal",
      can_assign: false,
      in_user_branch: false,
      allow_sector: false,
      allow_department: false,
      allow_user: false,
      parent_context: null,
      sectors: [],
      departments: [],
      users: [],
      active_assignment_count: 0,
      message: "Assign the parent plan level before assigning this level.",
    };
  }

  if (parentContext.type === "sector") {
    const departments = await InternalStructure.findAll({
      where: {
        government_structure_id: parentContext.government_structure_id,
        is_active: true,
      },
      order: [
        ["level", "ASC"],
        ["name", "ASC"],
      ],
      transaction,
    });

    const directUsers = await User.findAll({
      where: {
        government_structure_id: parentContext.government_structure_id,
        internal_structure_id: null,
        is_active: true,
      },
      attributes: ["user_id", "full_name", "email", "government_structure_id", "internal_structure_id"],
      order: [["full_name", "ASC"]],
      transaction,
    });

    const activeInternal = await getActiveInternalAssignments(planNodeId, transaction);
    const propagationMessage = buildPropagationMessage(baseResponse);

    return {
      ...baseResponse,
      assignment_mode: "internal",
      can_assign: true,
      in_user_branch: false,
      allow_sector: false,
      allow_department: departments.length > 0,
      allow_user: directUsers.length > 0,
      parent_context: parentContext,
      sectors: [],
      departments: mapDepartmentOptions(departments),
      users: mapUserOptions(directUsers),
      active_assignment_count: activeInternal.length,
      message: propagationMessage,
    };
  }

  if (parentContext.type === "department") {
    const childDepartments = await InternalStructure.findAll({
      where: {
        parent_id: parentContext.internal_structure_id,
        is_active: true,
      },
      order: [["name", "ASC"]],
      transaction,
    });

    const departmentUsers = await User.findAll({
      where: {
        internal_structure_id: parentContext.internal_structure_id,
        is_active: true,
      },
      attributes: ["user_id", "full_name", "email", "government_structure_id", "internal_structure_id"],
      order: [["full_name", "ASC"]],
      transaction,
    });

    const isLeafDepartment = childDepartments.length === 0;
    const activeInternal = await getActiveInternalAssignments(planNodeId, transaction);
    const propagationMessage = buildPropagationMessage(baseResponse);

    return {
      ...baseResponse,
      assignment_mode: "internal",
      can_assign: true,
      in_user_branch: false,
      allow_sector: false,
      allow_department: !isLeafDepartment,
      allow_user: isLeafDepartment || departmentUsers.length > 0,
      parent_context: parentContext,
      sectors: [],
      departments: mapDepartmentOptions(childDepartments),
      users: mapUserOptions(departmentUsers),
      active_assignment_count: activeInternal.length,
      message: isLeafDepartment
        ? propagationMessage
          ? `This department has no sub-departments. Assign a user to continue. ${propagationMessage}`
          : "This department has no sub-departments. Assign a user to continue."
        : propagationMessage,
    };
  }

  return {
    ...baseResponse,
    assignment_mode: "internal",
    can_assign: false,
    in_user_branch: true,
    allow_sector: false,
    allow_department: false,
    allow_user: false,
    parent_context: parentContext,
    sectors: [],
    departments: [],
    users: [],
    active_assignment_count: 0,
    message: "Invalid parent assignment context.",
  };
}

function buildPropagationMessage(baseResponse) {
  if (!baseResponse.allow_propagate_all_branches) return null;
  const count = baseResponse.active_parent_branch_count ?? baseResponse.parent_branch_options.length;
  if (count <= 1) return null;
  return `Default: assignment will propagate to all ${count} active parent branches. Switch to a specific branch to assign to one branch only.`;
}

async function resolveInternalTargetForBranch(
  planNode,
  parentNode,
  { internal_structure_id, user_id },
  branchFields,
  transaction
) {
  const branchContext = {
    branchExternalAssignmentId: branchFields.branch_external_assignment_id,
    branchInternalAssignmentId: branchFields.branch_internal_assignment_id,
  };

  if (user_id) {
    return { user_id, internal_structure_id: null };
  }

  if (!internal_structure_id) {
    return null;
  }

  const options = await getAssignmentOptionsForNode(planNode.plan_node_id, transaction, branchContext);
  if (options.departments.some((d) => d.internal_structure_id === internal_structure_id)) {
    return { internal_structure_id, user_id: null };
  }

  const source = await InternalStructure.findByPk(internal_structure_id, { transaction });
  if (!source) return null;

  const match = options.departments.find(
    (d) => d.name.trim().toLowerCase() === source.name.trim().toLowerCase()
  );
  if (match) {
    return { internal_structure_id: match.internal_structure_id, user_id: null };
  }

  return null;
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

async function validateExternalAssignmentTarget(planNode, governmentStructureId, transaction) {
  const options = await getAssignmentOptionsForNode(planNode.plan_node_id, transaction);

  if (options.assignment_mode !== "external") {
    return "Root level plans must use sector assignment. Departments and users are not allowed at level 1.";
  }

  const allowed = options.sectors.some(
    (s) => s.government_structure_id === governmentStructureId
  );
  if (!allowed) {
    return "Selected sector is not allowed. Choose the plan sector or one of its child sectors.";
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
  { internal_structure_id, user_id },
  transaction,
  branchContext = {},
  branchFields = null
) {
  const options = await getAssignmentOptionsForNode(planNode.plan_node_id, transaction, branchContext);

  if (!options.can_assign) {
    return options.message || "Assignment is not allowed at this level.";
  }

  if (options.assignment_mode === "external") {
    return "Use sector assignment for root plan levels.";
  }

  if (internal_structure_id && user_id) {
    return "Cannot assign to both department and user.";
  }

  const duplicateBranchFields = branchFields || {
    branch_external_assignment_id: branchContext.branchExternalAssignmentId || null,
    branch_internal_assignment_id: branchContext.branchInternalAssignmentId || null,
  };

  if (internal_structure_id) {
    if (!options.allow_department) {
      if (options.in_user_branch) {
        return "Cannot assign to a department after entering a user assignment branch.";
      }
      return "Department assignment is not allowed at this level.";
    }
    const allowed = options.departments.some(
      (d) => d.internal_structure_id === internal_structure_id
    );
    if (!allowed) {
      return "Selected department is not a valid child of the parent assignment.";
    }

    const duplicate = await InternalAssignment.findOne({
      where: buildBranchDuplicateWhere(planNode.plan_node_id, duplicateBranchFields, {
        internal_structure_id,
      }),
      transaction,
    });
    if (duplicate) {
      return "This department is already actively assigned on this branch.";
    }

    return null;
  }

  if (user_id) {
    if (!options.allow_user) {
      return "User assignment is not allowed at this level.";
    }
    const allowed = options.users.some((u) => u.user_id === user_id);
    if (!allowed) {
      return "Selected user is not valid for the current assignment hierarchy.";
    }

    const duplicate = await InternalAssignment.findOne({
      where: buildBranchDuplicateWhere(planNode.plan_node_id, duplicateBranchFields, {
        user_id,
      }),
      transaction,
    });
    if (duplicate) {
      return "This user is already actively assigned on this branch.";
    }

    return null;
  }

  return "Must assign to either department or user.";
}

module.exports = {
  getAssignmentOptionsForNode,
  validateExternalAssignmentTarget,
  validateInternalAssignmentTarget,
  resolveBranchFieldsForCreate,
  resolveInternalTargetForBranch,
  resolveAllParentBranchContexts,
  deactivateActiveAssignmentsForNode,
  collectDescendantSectorIds,
};
