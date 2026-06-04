const Joi = require("joi");

const getNotificationsQuerySchema = Joi.object({
  category: Joi.string().valid("plans", "assignments", "system", "logs").optional(),
  unread_only: Joi.string().valid("true", "false").optional(),
});

const markAllReadSchema = Joi.object({
  category: Joi.string().valid("plans", "assignments", "system", "logs").optional(),
});

const idParamSchema = Joi.object({
  id: Joi.string().guid({ version: "uuidv4" }).required(),
});

const validate = (schema, source = "body") => (req, res, next) => {
  const dataToValidate =
    source === "query" ? req.query : source === "params" ? req.params : req.body;

  const { error } = schema.validate(dataToValidate, { abortEarly: false });
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
  validateGetNotificationsQuery: validate(getNotificationsQuerySchema, "query"),
  validateMarkAllRead: validate(markAllReadSchema),
  validateIdParam: validate(idParamSchema, "params"),
};
