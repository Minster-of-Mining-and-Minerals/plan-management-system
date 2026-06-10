const Joi = require("joi");

/** Seeded entities use deterministic UUID v5; runtime creates use v4. */
const UUID_GUID = { version: ["uuidv4", "uuidv5"] };

/**
 * Converts empty strings on optional ID fields to null before Joi validation.
 */
function sanitizeOptionalIds(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data;
  }

  const sanitized = { ...data };
  for (const [key, value] of Object.entries(sanitized)) {
    if (value === "" && (key === "parent_id" || key.endsWith("_id"))) {
      sanitized[key] = null;
    }
  }
  return sanitized;
}

function optionalUuid(fieldName) {
  return Joi.string()
    .trim()
    .guid(UUID_GUID)
    .allow(null)
    .optional()
    .messages({
      "string.guid": `"${fieldName}" must be a valid GUID`,
    });
}

function requiredUuid(fieldName) {
  return Joi.string()
    .trim()
    .guid(UUID_GUID)
    .required()
    .messages({
      "string.guid": `"${fieldName}" must be a valid GUID`,
      "any.required": `"${fieldName}" is required`,
    });
}

function validateMiddleware(schema, source = "body") {
  return (req, res, next) => {
    let dataToValidate;

    if (source === "body") {
      req.body = sanitizeOptionalIds(req.body);
      dataToValidate = req.body;
    } else if (source === "query") {
      req.query = sanitizeOptionalIds(req.query);
      dataToValidate = req.query;
    } else {
      dataToValidate = req.params;
    }

    const { error, value } = schema.validate(dataToValidate, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((e) => e.message),
      });
    }

    if (source === "body") {
      req.body = value;
    } else if (source === "query") {
      req.query = value;
    }

    next();
  };
}

module.exports = {
  UUID_GUID,
  sanitizeOptionalIds,
  optionalUuid,
  requiredUuid,
  validateMiddleware,
};
