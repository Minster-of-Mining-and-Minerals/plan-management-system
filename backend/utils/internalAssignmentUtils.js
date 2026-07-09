"use strict";

const ASSIGNMENT_TARGET_FIELDS = [
  "user_id",
  "role_id",
  "permission_group_id",
  "internal_structure_id",
];

/**
 * Ensures copied/derived internal assignments satisfy the single-target model rule.
 * Legacy seed rows may include both department and user; prefer the most specific target.
 */
function normalizeInternalAssignmentTargetFields(assignment) {
  const targets = ASSIGNMENT_TARGET_FIELDS.map((field) => [field, assignment[field] || null]).filter(
    ([, value]) => Boolean(value)
  );

  const empty = {
    user_id: null,
    internal_structure_id: null,
    role_id: null,
    permission_group_id: null,
  };

  if (targets.length === 0) {
    return empty;
  }

  if (targets.length === 1) {
    return { ...empty, [targets[0][0]]: targets[0][1] };
  }

  for (const field of ASSIGNMENT_TARGET_FIELDS) {
    const value = assignment[field];
    if (value) {
      return { ...empty, [field]: value };
    }
  }

  return { ...empty, [targets[0][0]]: targets[0][1] };
}

module.exports = {
  normalizeInternalAssignmentTargetFields,
};
