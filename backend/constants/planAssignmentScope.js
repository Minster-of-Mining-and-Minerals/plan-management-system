"use strict";

/** Target type for an assignment record */
const ASSIGNMENT_TARGET_TYPE = {
  SECTOR: "sector",
  USER: "user",
  DEPARTMENT: "department",
  ROLE: "role",
  PERMISSION_GROUP: "permission_group",
};

/** How child assignment pickers are scoped */
const ASSIGNMENT_SCOPE_TYPE = {
  SECTOR: "sector",
  DEPARTMENT_SUBTREE: "department_subtree",
};

module.exports = {
  ASSIGNMENT_TARGET_TYPE,
  ASSIGNMENT_SCOPE_TYPE,
};
