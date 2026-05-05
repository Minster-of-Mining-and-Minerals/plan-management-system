const Joi = require("joi");

/**
 * ================= ASSIGNMENT ACTION VALIDATORS =================
 */

const createAssignmentActionSchema = Joi.object({
    name: Joi.string().trim().max(100).required().messages({
        "string.empty": "Name is required",
        "string.max": "Name cannot exceed 100 characters",
        "any.required": "Name is required",
    }),

    code: Joi.string().trim().max(50).required().messages({
        "string.empty": "Code is required",
        "string.max": "Code cannot exceed 50 characters",
        "any.required": "Code is required",
    }),

    description: Joi.string().trim().optional().allow(null, ""),

    is_approval: Joi.boolean().default(false),
    is_execution: Joi.boolean().default(false),
    is_reporting: Joi.boolean().default(false),
});

const updateAssignmentActionSchema = Joi.object({
    name: Joi.string().trim().max(100).optional(),
    description: Joi.string().trim().optional().allow(null, ""),
    is_approval: Joi.boolean().optional(),
    is_execution: Joi.boolean().optional(),
    is_reporting: Joi.boolean().optional(),
});

const getAssignmentActionsQuerySchema = Joi.object({
    type: Joi.string().valid("approval", "execution", "reporting").optional(),
});

/**
 * ================= EXTERNAL ASSIGNMENT VALIDATORS =================
 */

const createExternalAssignmentSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),

    government_structure_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "government_structure_id must be a valid UUID",
        "any.required": "government_structure_id is required",
    }),

    role: Joi.string().valid("owner", "collaborator").default("collaborator"),
});

const updateExternalAssignmentSchema = Joi.object({
    role: Joi.string().valid("owner", "collaborator").optional(),
});

/**
 * ================= INTERNAL ASSIGNMENT VALIDATORS =================
 */

const createInternalAssignmentSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),

    internal_structure_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),

    user_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),

    action_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "action_id must be a valid UUID",
        "any.required": "action_id is required",
    }),
}).custom((value, helpers) => {
    // Custom validation: either internal_structure_id OR user_id must be provided (not both)
    if (!value.internal_structure_id && !value.user_id) {
        return helpers.error("any.custom", {
            message: "Must assign to either internal_structure_id or user_id",
        });
    }

    // Optionally: prevent both if business rule requires exclusive assignment
    // if (value.internal_structure_id && value.user_id) {
    //   return helpers.error("any.custom", {
    //     message: "Cannot assign to both internal_structure_id and user_id simultaneously",
    //   });
    // }

    return value;
});

const updateInternalAssignmentSchema = Joi.object({
    internal_structure_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
    user_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
    action_id: Joi.string().guid({ version: "uuidv4" }).optional(),
}).custom((value, helpers) => {
    // Only validate if both are being set to null
    if (value.internal_structure_id === null && value.user_id === null) {
        return helpers.error("any.custom", {
            message: "Must assign to either internal_structure_id or user_id",
        });
    }

    // Optionally: prevent both if business rule requires exclusive assignment
    // if (value.internal_structure_id && value.user_id) {
    //   return helpers.error("any.custom", {
    //     message: "Cannot assign to both internal_structure_id and user_id simultaneously",
    //   });
    // }

    return value;
});

/**
 * ================= ACTION LOG VALIDATORS =================
 */

const createActionLogSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),

    action_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "action_id must be a valid UUID",
        "any.required": "action_id is required",
    }),

    user_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "user_id must be a valid UUID",
        "any.required": "user_id is required",
    }),

    comment: Joi.string().trim().optional().allow(null, ""),

    status: Joi.string().valid("pending", "submitted", "approved", "rejected", "forwarded")
        .default("submitted"),
});

const updateActionLogStatusSchema = Joi.object({
    status: Joi.string().valid("pending", "submitted", "approved", "rejected", "forwarded")
        .required()
        .messages({
            "any.required": "Status is required",
            "any.only": "Status must be one of: pending, submitted, approved, rejected, forwarded",
        }),

    comment: Joi.string().trim().optional().allow(null, ""),
});

const getActionLogsQuerySchema = Joi.object({
    status: Joi.string().valid("pending", "submitted", "approved", "rejected", "forwarded").optional(),
    action_id: Joi.string().guid({ version: "uuidv4" }).optional(),
});

/**
 * ================= PARAM VALIDATORS =================
 */

const idParamSchema = Joi.object({
    id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "ID must be a valid UUID",
        "any.required": "ID is required",
    }),
});

const nodeIdParamSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),
});

const userIdParamSchema = Joi.object({
    user_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "user_id must be a valid UUID",
        "any.required": "user_id is required",
    }),
});

/**
 * ================= MIDDLEWARES =================
 */

const validate = (schema, source = "body") => (req, res, next) => {
    let dataToValidate;

    if (source === "body") {
        dataToValidate = req.body;
    } else if (source === "query") {
        dataToValidate = req.query;
    } else if (source === "params") {
        dataToValidate = req.params;
    }

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
    // Assignment Action Validators
    validateCreateAssignmentAction: validate(createAssignmentActionSchema),
    validateUpdateAssignmentAction: validate(updateAssignmentActionSchema),
    validateGetAssignmentActionsQuery: validate(getAssignmentActionsQuerySchema, "query"),

    // External Assignment Validators
    validateCreateExternalAssignment: validate(createExternalAssignmentSchema),
    validateUpdateExternalAssignment: validate(updateExternalAssignmentSchema),

    // Internal Assignment Validators
    validateCreateInternalAssignment: validate(createInternalAssignmentSchema),
    validateUpdateInternalAssignment: validate(updateInternalAssignmentSchema),

    // Action Log Validators
    validateCreateActionLog: validate(createActionLogSchema),
    validateUpdateActionLogStatus: validate(updateActionLogStatusSchema),
    validateGetActionLogsQuery: validate(getActionLogsQuerySchema, "query"),

    // Param Validators
    validateIdParam: validate(idParamSchema, "params"),
    validateNodeIdParam: validate(nodeIdParamSchema, "params"),
    validateUserIdParam: validate(userIdParamSchema, "params"),
};