"use strict";

const Joi = require("joi");

const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required(),
  code: Joi.string().trim().max(64).allow("", null).optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  department_id: Joi.string().uuid().allow(null).optional(),
  unit_price: Joi.number().min(0).required(),
  tax_percent: Joi.number().min(0).max(100).optional(),
  currency: Joi.string().trim().max(8).optional(),
  effective_date: Joi.date().iso().allow(null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateServiceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),
  code: Joi.string().trim().max(64).allow("", null).optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  department_id: Joi.string().uuid().allow(null).optional(),
  unit_price: Joi.number().min(0).optional(),
  tax_percent: Joi.number().min(0).max(100).optional(),
  currency: Joi.string().trim().max(8).optional(),
  effective_date: Joi.date().iso().allow(null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
}).min(1);

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  code: Joi.string().trim().lowercase().min(2).max(64).required(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  code: Joi.string().trim().lowercase().min(2).max(64).optional(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
}).min(1);

const createEntrySchema = Joi.object({
  service_id: Joi.string().uuid().required(),
  quantity: Joi.number().min(0.01).optional(),
  note: Joi.string().trim().max(2000).allow("", null).optional(),
  unit_price: Joi.number().min(0).optional(),
  override_reason: Joi.string().trim().max(2000).allow("", null).optional(),
  discount_type: Joi.string().valid("percentage", "fixed").optional(),
  discount_value: Joi.number().min(0).optional(),
  discount_reason: Joi.string().trim().max(2000).allow("", null).optional(),
});

const updateEntrySchema = Joi.object({
  quantity: Joi.number().min(0.01).optional(),
  note: Joi.string().trim().max(2000).allow("", null).optional(),
  unit_price: Joi.number().min(0).optional(),
  override_reason: Joi.string().trim().max(2000).allow("", null).optional(),
}).min(1);

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  next();
};

module.exports = {
  validateCreateService: validate(createServiceSchema),
  validateUpdateService: validate(updateServiceSchema),
  validateCreateCategory: validate(createCategorySchema),
  validateUpdateCategory: validate(updateCategorySchema),
  validateCreateEntry: validate(createEntrySchema),
  validateUpdateEntry: validate(updateEntrySchema),
};
