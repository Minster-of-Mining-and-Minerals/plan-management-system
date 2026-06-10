const Joi = require("joi");
const {
  optionalUuid,
  requiredUuid,
  validateMiddleware,
} = require("../helpers/joiFieldHelpers");

/**
 * ================= CREATE =================
 */
const createGovernmentStructureSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Name is required",
  }),

  parent_id: optionalUuid("parent_id"),

  level: Joi.number().integer().min(1).optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * ================= UPDATE =================
 */
const updateGovernmentStructureSchema = Joi.object({
  name: Joi.string().trim().optional(),

  parent_id: optionalUuid("parent_id"),

  level: Joi.number().integer().min(1).optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * ================= ADD USERS =================
 */
const addUsersSchema = Joi.object({
  government_structure_id: requiredUuid("government_structure_id"),

  user_ids: Joi.array()
    .items(
      Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).messages({
        "string.guid": "Each user_id must be a valid UUID",
      })
    )
    .min(1)
    .required(),
});

/**
 * ================= REMOVE USER =================
 */
const removeUserSchema = Joi.object({
  user_id: requiredUuid("user_id"),
});

/**
 * ================= ADD PERMISSION GROUPS =================
 */
const addPermissionGroupsSchema = Joi.object({
  government_structure_id: requiredUuid("government_structure_id"),

  permission_group_ids: Joi.array()
    .items(
      Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).messages({
        "string.guid": "Each permission_group_id must be a valid UUID",
      })
    )
    .min(1)
    .required(),
});

/**
 * ================= REMOVE PERMISSION GROUP =================
 */
const removePermissionGroupSchema = Joi.object({
  government_structure_id: requiredUuid("government_structure_id"),

  permission_group_id: requiredUuid("permission_group_id"),
});

module.exports = {
  validateCreateGovernmentStructure: validateMiddleware(createGovernmentStructureSchema),
  validateUpdateGovernmentStructure: validateMiddleware(updateGovernmentStructureSchema),
  validateAddUsers: validateMiddleware(addUsersSchema),
  validateRemoveUser: validateMiddleware(removeUserSchema),
  validateAddPermissionGroups: validateMiddleware(addPermissionGroupsSchema),
  validateRemovePermissionGroup: validateMiddleware(removePermissionGroupSchema),
};