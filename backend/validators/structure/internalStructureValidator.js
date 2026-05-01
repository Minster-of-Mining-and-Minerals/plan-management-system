const Joi = require("joi");

/**
 * CREATE
 */
const createInternalStructureSchema = Joi.object({
  name: Joi.string().trim().required(),

  government_structure_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),

  parent_id: Joi.string()
    .guid({ version: "uuidv4" })
    .optional()
    .allow(null),

  level: Joi.number().integer().optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * UPDATE
 */
const updateInternalStructureSchema = Joi.object({
  name: Joi.string().trim().optional(),

  government_structure_id: Joi.string()
    .guid({ version: "uuidv4" })
    .optional(),

  parent_id: Joi.string()
    .guid({ version: "uuidv4" })
    .optional()
    .allow(null),

  level: Joi.number().integer().optional(),

  is_active: Joi.boolean().optional(),
});

/**
 * ASSIGN USERS
 */
const assignUsersSchema = Joi.object({
  internal_structure_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),

  user_ids: Joi.array()
    .items(Joi.string().guid({ version: "uuidv4" }))
    .min(1)
    .required(),
});

/**
 * REMOVE USER
 */
const removeUserSchema = Joi.object({
  user_id: Joi.string()
    .guid({ version: "uuidv4" })
    .required(),
});

/**
 * MIDDLEWARES
 */
exports.validateCreateInternalStructure = (req, res, next) => {
  const { error } = createInternalStructureSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error)
    return res.status(400).json({
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });

  next();
};

exports.validateUpdateInternalStructure = (req, res, next) => {
  const { error } = updateInternalStructureSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error)
    return res.status(400).json({
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });

  next();
};

exports.validateAssignUsers = (req, res, next) => {
  const { error } = assignUsersSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.message });

  next();
};

exports.validateRemoveUser = (req, res, next) => {
  const { error } = removeUserSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.message });

  next();
};