"use strict";

const Joi = require("joi");
const { PAYMENT_METHODS } = require("../../config/cashierConstants");

const openSessionSchema = Joi.object({
  opening_float: Joi.number().min(0).optional(),
});

const closeSessionSchema = Joi.object({
  counted_cash_total: Joi.number().min(0).required(),
  close_notes: Joi.string().trim().max(2000).allow("", null).optional(),
});

const tenderSchema = Joi.object({
  method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required(),
  amount: Joi.number().min(0.01).required(),
  reference: Joi.string().trim().max(128).allow("", null).optional(),
  provider: Joi.string().trim().max(64).allow("", null).optional(),
});

const recordPaymentSchema = Joi.object({
  amount: Joi.number().min(0.01).optional(),
  reference_note: Joi.string().trim().max(2000).allow("", null).optional(),
  client_reference: Joi.string().uuid().optional(),
  tenders: Joi.array().items(tenderSchema).min(1).required(),
});

const voidPaymentSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(2000).required(),
});

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
  validateOpenSession: validate(openSessionSchema),
  validateCloseSession: validate(closeSessionSchema),
  validateRecordPayment: validate(recordPaymentSchema),
  validateVoidPayment: validate(voidPaymentSchema),
};
