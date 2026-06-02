"use strict";

const Joi = require("joi");
const { PHARMACY_PRESCRIPTION_STATUS_LIST } = require("../../config/pharmacyConstants");

const uuid = Joi.string().guid({ version: "uuidv4" });

const createPharmacySchema = Joi.object({
  pharmacy_name: Joi.string().trim().min(2).max(200).required(),
  pharmacy_code: Joi.string().trim().min(2).max(50).required(),
  license_number: Joi.string().trim().max(100).allow(null, "").optional(),
  phone: Joi.string().trim().max(50).allow(null, "").optional(),
  email: Joi.string().email().allow(null, "").optional(),
  address: Joi.string().allow(null, "").optional(),
  city: Joi.string().trim().max(100).allow(null, "").optional(),
  region: Joi.string().trim().max(100).allow(null, "").optional(),
  country: Joi.string().trim().max(100).allow(null, "").optional(),
  contact_person: Joi.string().trim().max(150).allow(null, "").optional(),
  logo: Joi.string().allow(null, "").optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updatePharmacySchema = createPharmacySchema.fork(
  ["pharmacy_name", "pharmacy_code"],
  (s) => s.optional()
).min(1);

const createPharmacyUserSchema = Joi.object({
  full_name: Joi.string().trim().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).optional(),
  phone_number: Joi.string().allow(null, "").optional(),
  portal_role: Joi.string().valid("admin", "staff").optional(),
  is_active: Joi.boolean().optional(),
});

const sendPrescriptionSchema = Joi.object({
  prescription_id: uuid.required(),
  pharmacy_id: uuid.required(),
});

const updateWorkflowSchema = Joi.object({
  pharmacy_status: Joi.string()
    .valid(...PHARMACY_PRESCRIPTION_STATUS_LIST)
    .optional(),
  pharmacy_notes: Joi.string().allow(null, "").optional(),
  change_summary: Joi.string().allow(null, "").optional(),
  create_fulfillment: Joi.boolean().optional(),
  fulfillment_status: Joi.string().optional(),
  fulfillment_notes: Joi.string().allow(null, "").optional(),
  items: Joi.array()
    .items(
      Joi.object({
        pharmacy_prescription_item_id: uuid.required(),
        dispensed_quantity: Joi.string().allow(null, "").optional(),
        pharmacy_item_status: Joi.string()
          .valid("pending", "dispensed", "partial", "unavailable", "substituted")
          .optional(),
        substitution_notes: Joi.string().allow(null, "").optional(),
        pharmacy_notes: Joi.string().allow(null, "").optional(),
      })
    )
    .optional(),
}).min(1);

const validate =
  (schema) =>
  (req, res, next) => {
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
    req.body = value;
    next();
  };

module.exports = {
  validateCreatePharmacy: validate(createPharmacySchema),
  validateUpdatePharmacy: validate(updatePharmacySchema),
  validateCreatePharmacyUser: validate(createPharmacyUserSchema),
  validateSendPrescription: validate(sendPrescriptionSchema),
  validateUpdatePharmacyWorkflow: validate(updateWorkflowSchema),
  validatePortalList: (req, res, next) => next(),
  validatePharmacyId: (req, res, next) => next(),
};
