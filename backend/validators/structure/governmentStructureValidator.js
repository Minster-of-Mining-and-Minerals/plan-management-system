const Joi = require("joi");

/**
 * ================= CREATE =================
 */
const createGovernmentStructureSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Name is required",
  }),

  parent_id: Joi.string()
    .guid({ version: "uuidv4" })
    .allow(null, "")
    .optional()
    .messages({
      "string.guid": "parent_id must be a valid UUID",
    }),

  level: Joi.number().integer().min(1).optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * ================= UPDATE =================
 */
const updateGovernmentStructureSchema = Joi.object({
  name: Joi.string().trim().optional(),

  parent_id: Joi.string()
    .guid({ version: "uuidv4" })
    .allow(null, "")
    .optional(),

  level: Joi.number().integer().min(1).optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * ================= ADD USERS =================
 */
const addUsersSchema = Joi.object({
  government_structure_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),

  user_ids: Joi.array()
    .items(
      Joi.string().guid({ version: "uuidv4" }).messages({
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
  user_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),
});

/**
 * ================= ADD PERMISSION GROUPS =================
 */
const addPermissionGroupsSchema = Joi.object({
  government_structure_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),

  permission_group_ids: Joi.array()
    .items(
      Joi.string().guid({ version: "uuidv4" }).messages({
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
  government_structure_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),

  permission_group_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),
});

/**
 * ================= MIDDLEWARES =================
 */

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });
  }

  next();
};

module.exports = {
  validateCreateGovernmentStructure: validate(createGovernmentStructureSchema),
  validateUpdateGovernmentStructure: validate(updateGovernmentStructureSchema),
  validateAddUsers: validate(addUsersSchema),
  validateRemoveUser: validate(removeUserSchema),
  validateAddPermissionGroups: validate(addPermissionGroupsSchema),
  validateRemovePermissionGroup: validate(removePermissionGroupSchema),
};