"use strict";

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
} = require("../models");
const { Op } = require("sequelize");
const scopeService = require("./planAssignmentScopeService");

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
      { model: Role, as: "role" },
      { model: PermissionGroup, as: "permissionGroup" },
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
        { model: Role, as: "role" },
        { model: PermissionGroup, as: "permissionGroup" },
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
      { model: Role, as: "role" },
      { model: PermissionGroup, as: "permissionGroup" },
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
  const type = assignment.user_id
    ? "user"
    : assignment.role_id
      ? "role"
      : assignment.permission_group_id
        ? "permission_group"
        : "department";

  return {
    internal_assignment_id: assignment.internal_assignment_id,
    label:
      assignment.user?.full_name ||
      assignment.internalStructure?.name ||
      assignment.role?.name ||
      assignment.permissionGroup?.name,
    type,
    user_id: assignment.user_id,
    internal_structure_id: assignment.internal_structure_id,
    role_id: assignment.role_id,
    permission_group_id: assignment.permission_group_id,
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
    label: assignment.user?.full_name || assignment.internalStructure?.name || assignment.role?.name,
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
  const updateOptions = { where: { plan_node_id: planNodeId, is_active: true }, transaction, validate: false };

  if (assignmentType === "external") {
    await ExternalAssignment.update({ is_active: false }, updateOptions);
    return;
  }

  await InternalAssignment.update({ is_active: false }, updateOptions);
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

  const ancestorChain = await getAncestorNodes(planNode, transaction);
  const parent = ancestorChain[0] ?? null;
  const parentBranchOptions = await getParentBranchOptions(parent, transaction);
  const hasMultipleBranches = parentBranchOptions.length > 1;
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

  return scopeService.getAssignmentOptionsForNode(planNodeId, transaction, branchContext, {
    parentBranchOptions,
    parentIsShared: parent?.assignment_sharing_mode === "shared",
    supportsBranchSelection: hasMultipleBranches,
    allowPropagateAllBranches,
    effectiveBranchContext,
  });
}

async function resolveInternalTargetForBranch(
  planNode,
  parentNode,
  { internal_structure_id, user_id, role_id, permission_group_id },
  branchFields,
  transaction
) {
  const branchContext = {
    branchExternalAssignmentId: branchFields.branch_external_assignment_id,
    branchInternalAssignmentId: branchFields.branch_internal_assignment_id,
  };

  if (user_id) {
    return {
      user_id,
      internal_structure_id: null,
      role_id: null,
      permission_group_id: null,
    };
  }

  if (role_id) {
    return {
      user_id: null,
      internal_structure_id: null,
      role_id,
      permission_group_id: null,
    };
  }

  if (permission_group_id) {
    return {
      user_id: null,
      internal_structure_id: null,
      role_id: null,
      permission_group_id,
    };
  }

  if (!internal_structure_id) {
    return null;
  }

  const options = await getAssignmentOptionsForNode(planNode.plan_node_id, transaction, branchContext);
  if (options.departments.some((d) => d.internal_structure_id === internal_structure_id)) {
    return {
      internal_structure_id,
      user_id: null,
      role_id: null,
      permission_group_id: null,
    };
  }

  const source = await InternalStructure.findByPk(internal_structure_id, { transaction });
  if (!source) return null;

  const match = options.departments.find(
    (d) => d.name.trim().toLowerCase() === source.name.trim().toLowerCase()
  );
  if (match) {
    return {
      internal_structure_id: match.internal_structure_id,
      user_id: null,
      role_id: null,
      permission_group_id: null,
    };
  }

  return null;
}

async function validateExternalAssignmentTarget(planNode, governmentStructureId, transaction) {
  return scopeService.validateExternalAssignmentTarget(
    planNode,
    governmentStructureId,
    transaction
  );
}

async function validateInternalAssignmentTarget(
  planNode,
  target,
  transaction,
  branchContext = {},
  branchFields = null,
  options = {}
) {
  return scopeService.validateInternalAssignmentTarget(
    planNode,
    target,
    transaction,
    branchContext,
    branchFields,
    options
  );
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
