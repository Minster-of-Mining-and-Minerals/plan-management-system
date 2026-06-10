const Joi = require("joi");
const {
  optionalUuid,
  requiredUuid,
  validateMiddleware,
} = require("../helpers/joiFieldHelpers");

/**
 * CREATE
 */
const createInternalStructureSchema = Joi.object({
  name: Joi.string().trim().required(),

  government_structure_id: requiredUuid("government_structure_id"),

  parent_id: optionalUuid("parent_id"),

  level: Joi.number().integer().optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * UPDATE
 */
const updateInternalStructureSchema = Joi.object({
  name: Joi.string().trim().optional(),

  government_structure_id: optionalUuid("government_structure_id"),

  parent_id: optionalUuid("parent_id"),

  level: Joi.number().integer().optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * ASSIGN USERS
 */
const assignUsersSchema = Joi.object({
  internal_structure_id: requiredUuid("internal_structure_id"),

  user_ids: Joi.array()
    .items(Joi.string().guid({ version: ["uuidv4", "uuidv5"] }))
    .min(1)
    .required(),
});

/**
 * REMOVE USER
 */
const removeUserSchema = Joi.object({
  user_id: requiredUuid("user_id"),
});

module.exports = {
  validateCreateInternalStructure: validateMiddleware(createInternalStructureSchema),
  validateUpdateInternalStructure: validateMiddleware(updateInternalStructureSchema),
  validateAssignUsers: validateMiddleware(assignUsersSchema),
  validateRemoveUser: validateMiddleware(removeUserSchema),
};
