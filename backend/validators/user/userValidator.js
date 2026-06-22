const Joi = require("joi");
const { joiEmailField, normalizeEmailBody } = require("../../utils/emailUtils");
const ETHIOPIAN_PHONE_REGEX = /^(\+251|0)(9|7)\d{8}$/;
// =================== Create User Schema ===================
const createUserSchema = Joi.object({
  full_name: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Full name is required.",
    "string.min": "Full name must be at least 3 characters long.",
  }),

  email: joiEmailField({ required: true }).messages({
    "string.empty": "Email is required.",
  }),

  phone_number: Joi.string()
    .pattern(ETHIOPIAN_PHONE_REGEX)
    .required()
    .messages({
      "string.empty": "Phone number is required.",
      "string.pattern.base":
        "Phone number must be a valid Ethiopian format (e.g., +2519XXXXXXXX or 09XXXXXXXX).",
    }),


  role_ids: Joi.array()
    .items(
      Joi.string()
        .guid({ version: ["uuidv4", "uuidv5"] })
        .messages({ "string.guid": "Each role ID must be a valid UUID." })
    )
    .optional()
    .allow(null)
    .messages({
      "array.base": "Role ID must be an array of UUIDs.",
    }),
});

// =================== Update User Schema ===================
const updateUserSchema = Joi.object({
  full_name: Joi.string().min(3).max(100).optional(),
  email: joiEmailField({ required: false }),
  phone_number: Joi.string()
    .pattern(ETHIOPIAN_PHONE_REGEX)
    .optional()
    .messages({
      "string.pattern.base":
        "Phone number must be a valid Ethiopian format (e.g., +2519XXXXXXXX or 09XXXXXXXX).",
    }),
  // Allow updating assigned roles
  role_ids: Joi.array()
    .items(Joi.string().guid({ version: ["uuidv4", "uuidv5"] }))
    .optional()
    .messages({
      "string.guid": "Each role ID must be a valid UUID.",
    }),
  is_active: Joi.boolean().optional(),
  is_first_logged_in: Joi.boolean().optional(),
  profile_image: Joi.string().max(500).allow(null, "").optional(),
});

const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  phone_number: Joi.string()
    .pattern(ETHIOPIAN_PHONE_REGEX)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base":
        "Phone number must be a valid Ethiopian format (e.g., +2519XXXXXXXX or 09XXXXXXXX).",
    }),
  profile_image: Joi.string().max(500).allow(null, "").optional(),
}).min(1);

// =================== Validators ===================
exports.validateCreateUser = (req, res, next) => {
  normalizeEmailBody(req);
  const { error } = createUserSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};

exports.validateUpdateUser = (req, res, next) => {
  normalizeEmailBody(req);
  const { error } = updateUserSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};

exports.validateUpdateProfile = (req, res, next) => {
  const { error } = updateProfileSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }
  next();
};
