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

async function getPrimaryExternalAssignment(planNodeId, transaction) {
  return ExternalAssignment.findOne({
    where: { plan_node_id: planNodeId },
    order: [["created_at", "ASC"]],
    include: [{ model: GovernmentStructure, as: "governmentStructure" }],
    transaction,
  });
}

async function getPrimaryInternalAssignment(planNodeId, transaction) {
  return InternalAssignment.findOne({
    where: { plan_node_id: planNodeId },
    order: [["created_at", "ASC"]],
    include: [
      { model: InternalStructure, as: "internalStructure" },
      { model: User, as: "user", attributes: { exclude: ["password"] } },
    ],
    transaction,
  });
}

async function resolveRootSectorId(ancestorChain, planVersion, transaction) {
  const levelOneNode =
    ancestorChain.find((n) => n.level === 1) ||
    ancestorChain[ancestorChain.length - 1] ||
    null;

  if (levelOneNode) {
    const external = await getPrimaryExternalAssignment(
      levelOneNode.plan_node_id,
      transaction
    );
    if (external?.government_structure_id) {
      return external.government_structure_id;
    }
  }

  return planVersion.government_structure_id;
}

async function isInUserBranch(ancestorChain, transaction) {
  for (const ancestor of ancestorChain) {
    const internal = await getPrimaryInternalAssignment(
      ancestor.plan_node_id,
      transaction
    );
    if (internal?.user_id) return true;
  }
  return false;
}

async function resolveParentAssignmentContext(parentNode, transaction) {
  if (!parentNode) return null;

  if (parentNode.level === 1 || !parentNode.parent_id) {
    const external = await getPrimaryExternalAssignment(
      parentNode.plan_node_id,
      transaction
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
    transaction
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

async function getAssignmentOptionsForNode(planNodeId, transaction = null) {
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

    return {
      plan_node_id: planNodeId,
      level: planNode.level,
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
      message: null,
    };
  }

  const userBranch = await isInUserBranch(ancestorChain, transaction);
  const sectorContextId = await resolveRootSectorId(
    ancestorChain,
    planVersion,
    transaction
  );

  if (userBranch) {
    const users = await User.findAll({
      where: {
        government_structure_id: sectorContextId,
        is_active: true,
      },
      attributes: ["user_id", "full_name", "email", "government_structure_id", "internal_structure_id"],
      order: [["full_name", "ASC"]],
      transaction,
    });

    return {
      plan_node_id: planNodeId,
      level: planNode.level,
      assignment_mode: "internal",
      can_assign: true,
      in_user_branch: true,
      allow_sector: false,
      allow_department: false,
      allow_user: true,
      parent_context: await resolveParentAssignmentContext(parent, transaction),
      sectors: [],
      departments: [],
      users: mapUserOptions(users),
      message:
        "This branch is assigned to a user. Only user assignments are allowed at deeper levels.",
    };
  }

  const parentContext = await resolveParentAssignmentContext(parent, transaction);
  if (!parentContext) {
    return {
      plan_node_id: planNodeId,
      level: planNode.level,
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

    return {
      plan_node_id: planNodeId,
      level: planNode.level,
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
      message: null,
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

    return {
      plan_node_id: planNodeId,
      level: planNode.level,
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
      message: isLeafDepartment
        ? "This department has no sub-departments. Assign a user to continue."
        : null,
    };
  }

  return {
    plan_node_id: planNodeId,
    level: planNode.level,
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
    message: "Invalid parent assignment context.",
  };
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

  return null;
}

async function validateInternalAssignmentTarget(
  planNode,
  { internal_structure_id, user_id },
  transaction
) {
  const options = await getAssignmentOptionsForNode(planNode.plan_node_id, transaction);

  if (!options.can_assign) {
    return options.message || "Assignment is not allowed at this level.";
  }

  if (options.assignment_mode === "external") {
    return "Use sector assignment for root plan levels.";
  }

  if (internal_structure_id && user_id) {
    return "Cannot assign to both department and user.";
  }

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
    return null;
  }

  return "Must assign to either department or user.";
}

module.exports = {
  getAssignmentOptionsForNode,
  validateExternalAssignmentTarget,
  validateInternalAssignmentTarget,
  collectDescendantSectorIds,
};
