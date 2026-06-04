const Joi = require("joi");

/**
 * ================= PLAN VERSION VALIDATORS =================
 */

const createPlanVersionSchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).required().messages({
        "number.base": "Year must be a number",
        "number.min": "Year must be at least 2000",
        "number.max": "Year must be at most 2100",
        "any.required": "Year is required",
    }),

    government_structure_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "government_structure_id must be a valid UUID",
        "any.required": "government_structure_id is required",
    }),

    based_on_version_id: Joi.string().guid({ version: "uuidv4" }).allow(null, "").optional().messages({
        "string.guid": "based_on_version_id must be a valid UUID",
    }),

    plan_rule_id: Joi.string().guid({ version: "uuidv4" }).allow(null, "").optional(),
});

const updatePlanVersionSchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).optional(),
    version_number: Joi.number().integer().min(1).optional(),
    status: Joi.string().valid("draft", "active", "completed").optional(),
    government_structure_id: Joi.string().guid({ version: "uuidv4" }).optional(),
    based_on_version_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
    plan_rule_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
});

const updatePlanVersionStatusSchema = Joi.object({
    status: Joi.string().valid("draft", "active", "completed").required().messages({
        "any.required": "Status is required",
        "any.only": "Status must be one of: draft, active, completed",
    }),
});

const getPlanVersionsQuerySchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).optional(),
    government_structure_id: Joi.string().guid({ version: "uuidv4" }).optional(),
    status: Joi.string().valid("draft", "active", "completed").optional(),
    search: Joi.string().trim().allow("").optional(),
});

/**
 * ================= PLAN NODE VALIDATORS =================
 */

const createPlanNodeSchema = Joi.object({
    plan_version_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "plan_version_id must be a valid UUID",
        "any.required": "plan_version_id is required",
    }),

    parent_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),

    type: Joi.string().valid("strategic", "goal", "kpi", "task").required().messages({
        "any.required": "Type is required",
        "any.only": "Type must be one of: strategic, goal, kpi, task",
    }),

    title: Joi.string().trim().max(255).required().messages({
        "string.empty": "Title is required",
        "string.max": "Title cannot exceed 255 characters",
        "any.required": "Title is required",
    }),

    description: Joi.string().trim().optional().allow(null, ""),

    weight: Joi.number().min(0).default(0).optional(),

    weight_mode: Joi.string().valid("number", "percentage", "frequency").allow(null).optional(),

    level: Joi.number().integer().min(1).optional(),

    order: Joi.number().integer().min(0).default(0).optional(),
});

const updatePlanNodeSchema = Joi.object({
    parent_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
    type: Joi.string().valid("strategic", "goal", "kpi", "task").optional(),
    title: Joi.string().trim().max(255).optional(),
    description: Joi.string().trim().optional().allow(null, ""),
    weight: Joi.number().min(0).optional(),
    weight_mode: Joi.string().valid("number", "percentage", "frequency").allow(null).optional(),
    level: Joi.number().integer().min(1).optional(),
    order: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional(),
});

const getPlanNodesQuerySchema = Joi.object({
    plan_version_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "any.required": "plan_version_id is required",
    }),
    type: Joi.string().valid("strategic", "goal", "kpi", "task").optional(),
    parent_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
    level: Joi.number().integer().min(1).optional(),
    is_active: Joi.boolean().optional(),
});

const reorderPlanNodesSchema = Joi.object({
    parent_id: Joi.string().guid({ version: "uuidv4" }).allow(null).optional(),
    nodeOrders: Joi.array()
        .items(
            Joi.object({
                plan_node_id: Joi.string().guid({ version: "uuidv4" }).required(),
                order: Joi.number().integer().min(0).required(),
            })
        )
        .min(1)
        .required()
        .messages({
            "array.min": "At least one node order is required",
            "any.required": "nodeOrders is required",
        }),
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

const versionIdParamSchema = Joi.object({
    plan_version_id: Joi.string().guid({ version: "uuidv4" }).required().messages({
        "string.guid": "plan_version_id must be a valid UUID",
        "any.required": "plan_version_id is required",
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
    // Plan Version Validators
    validateCreatePlanVersion: validate(createPlanVersionSchema),
    validateUpdatePlanVersion: validate(updatePlanVersionSchema),
    validateUpdatePlanVersionStatus: validate(updatePlanVersionStatusSchema),
    validateGetPlanVersionsQuery: validate(getPlanVersionsQuerySchema, "query"),

    // Plan Node Validators
    validateCreatePlanNode: validate(createPlanNodeSchema),
    validateUpdatePlanNode: validate(updatePlanNodeSchema),
    validateGetPlanNodesQuery: validate(getPlanNodesQuerySchema, "query"),
    validateReorderPlanNodes: validate(reorderPlanNodesSchema),

    // Param Validators
    validateIdParam: validate(idParamSchema, "params"),
    validateVersionIdParam: validate(versionIdParamSchema, "params"),
};