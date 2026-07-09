const Joi = require("joi");
const { sanitizeOptionalIds } = require("../helpers/joiFieldHelpers");

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
    plan_node_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),

    government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "government_structure_id must be a valid UUID",
        "any.required": "government_structure_id is required",
    }),

    is_visible: Joi.boolean().default(true),
    requires_report: Joi.boolean().default(true),
    branch_external_assignment_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
});

const updateExternalAssignmentSchema = Joi.object({
    is_visible: Joi.boolean().optional(),
    requires_report: Joi.boolean().optional(),
});

/**
 * ================= INTERNAL ASSIGNMENT VALIDATORS =================
 */

const createInternalAssignmentSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),

    internal_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),

    user_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),

    role_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),

    permission_group_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),

    action_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),

    branch_external_assignment_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    branch_internal_assignment_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    propagate_all_branches: Joi.boolean().default(true),
}).custom((value, helpers) => {
    const targets = [
        value.internal_structure_id,
        value.user_id,
        value.role_id,
        value.permission_group_id,
    ].filter(Boolean);

    if (targets.length !== 1) {
        return helpers.error("any.custom", {
            message:
                "Must assign to exactly one of internal_structure_id, user_id, role_id, or permission_group_id",
        });
    }

    return value;
});

const updateInternalAssignmentSchema = Joi.object({
    internal_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    user_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    role_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    permission_group_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    action_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
}).custom((value, helpers) => {
    const provided = [
        value.internal_structure_id,
        value.user_id,
        value.role_id,
        value.permission_group_id,
    ].filter((v) => v !== undefined);

    if (provided.length === 0) {
        return helpers.error("any.custom", {
            message: "At least one assignment target field is required",
        });
    }

    const nonNull = [
        value.internal_structure_id,
        value.user_id,
        value.role_id,
        value.permission_group_id,
    ].filter((v) => v !== undefined && v !== null);

    if (nonNull.length > 1) {
        return helpers.error("any.custom", {
            message:
                "Cannot assign to more than one of internal_structure_id, user_id, role_id, or permission_group_id",
        });
    }

    return value;
});

/**
 * ================= ACTION LOG VALIDATORS =================
 */

const createActionLogSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),

    action_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "action_id must be a valid UUID",
        "any.required": "action_id is required",
    }),

    user_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
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
    action_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
});

/**
 * ================= PARAM VALIDATORS =================
 */

const idParamSchema = Joi.object({
    id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "ID must be a valid UUID",
        "any.required": "ID is required",
    }),
});

const nodeIdParamSchema = Joi.object({
    plan_node_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "plan_node_id must be a valid UUID",
        "any.required": "plan_node_id is required",
    }),
});

const getAssignmentOptionsQuerySchema = Joi.object({
    branch_external_assignment_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
    branch_internal_assignment_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
});

const getAssignmentsByNodeQuerySchema = Joi.object({
    include_inactive: Joi.boolean().optional(),
});

const userIdParamSchema = Joi.object({
    user_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
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
        req.body = sanitizeOptionalIds(req.body);
        dataToValidate = req.body;
    } else if (source === "query") {
        dataToValidate = sanitizeOptionalIds({ ...req.query });
    } else if (source === "params") {
        dataToValidate = req.params;
    }

    const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        convert: true,
    });

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
        req.validatedQuery = value;
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
    validateGetAssignmentOptionsQuery: validate(getAssignmentOptionsQuerySchema, "query"),
    validateGetAssignmentsByNodeQuery: validate(getAssignmentsByNodeQuerySchema, "query"),
};