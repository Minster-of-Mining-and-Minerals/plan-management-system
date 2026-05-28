"use strict";

const Joi = require("joi");

const itemSchema = Joi.object({
  item_name: Joi.string().trim().min(1).max(255).required(),
  strength: Joi.string().trim().max(120).allow("", null).optional(),
  route: Joi.string().trim().max(120).allow("", null).optional(),
  dosage: Joi.string().trim().max(120).allow("", null).optional(),
  frequency: Joi.string().trim().max(120).allow("", null).optional(),
  duration: Joi.string().trim().max(120).allow("", null).optional(),
  instructions: Joi.string().trim().max(4000).allow("", null).optional(),
  quantity: Joi.string().trim().max(64).allow("", null).optional(),
  notes: Joi.string().trim().max(2000).allow("", null).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
});

const createSchema = Joi.object({
  category_id: Joi.string().uuid().required(),
  name: Joi.string().trim().min(2).max(255).required(),
  code: Joi.string().trim().lowercase().min(2).max(64).required(),
  description: Joi.string().trim().max(4000).allow("", null).optional(),
  template_type: Joi.string().trim().max(64).allow("", null).optional(),
  template_content: Joi.string().trim().max(50000).allow("", null).optional(),
  has_template_signature: Joi.boolean().optional(),
  template_signature_file: Joi.string().trim().max(500).allow("", null).optional(),
  allow_user_signature_override: Joi.boolean().optional(),
  status: Joi.string().valid("active", "archived").optional(),
  items: Joi.array().items(itemSchema).optional(),
});

const updateSchema = createSchema.fork(
  ["category_id", "name", "code"],
  (s) => s.optional()
);

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  if (value) req.body = value;
  next();
};

module.exports = {
  validateCreateTemplate: validate(createSchema),
  validateUpdateTemplate: validate(updateSchema),
};
