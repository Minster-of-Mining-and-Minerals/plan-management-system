const Joi = require("joi");
const { optionalUuid, sanitizeOptionalIds } = require("../helpers/joiFieldHelpers");

/**
 * ================= PLAN VERSION VALIDATORS =================
 */

const createPlanVersionSchema = Joi.object({
    draft_name: Joi.string().trim().max(255).required().messages({
        "string.empty": "Draft name is required",
        "any.required": "Draft name is required",
    }),

    planning_start_date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            "string.pattern.base": "Planning start date must be YYYY-MM-DD",
            "any.required": "Planning start date is required",
        }),

    start_year: Joi.number().integer().min(2000).max(2100).optional(),

    planning_duration_years: Joi.number().integer().min(1).max(50).required().messages({
        "number.base": "Planning duration must be a number",
        "any.required": "Planning duration is required",
    }),

    year: Joi.number().integer().min(2000).max(2100).optional(),

    government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "government_structure_id must be a valid UUID",
        "any.required": "government_structure_id is required",
    }),

    based_on_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null, "").optional(),

    plan_rule_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null, "").optional(),
});

const updatePlanVersionSchema = Joi.object({
    draft_name: Joi.string().trim().max(255).optional(),
    planning_start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    start_year: Joi.number().integer().min(2000).max(2100).optional(),
    planning_duration_years: Joi.number().integer().min(1).max(50).optional(),
    end_year: Joi.forbidden(),
    planning_end_date: Joi.forbidden(),
    start_month: Joi.forbidden(),
    end_month: Joi.forbidden(),
    year: Joi.number().integer().min(2000).max(2100).optional(),
    version_number: Joi.number().integer().min(1).optional(),
    status: Joi.string().valid("draft", "active", "completed").optional(),
    government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
    based_on_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
    plan_rule_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
});

const updatePlanVersionStatusSchema = Joi.object({
    status: Joi.string()
        .valid("draft", "active", "completed", "finalized", "locked")
        .required()
        .messages({
            "any.required": "Status is required",
        }),
});

const duplicatePlanDraftSchema = Joi.object({
    draft_name: Joi.string().trim().max(255).optional(),
});

const updateAnnualTargetSchema = Joi.object({
    annual_target: Joi.number().min(0).allow(null).required(),
});

const updatePeriodTargetSchema = Joi.object({
    period_target: Joi.number().min(0).allow(null).required(),
});

const updatePeriodActualSchema = Joi.object({
    period_actual: Joi.number().min(0).allow(null).required(),
    use_parent_override: Joi.boolean().optional(),
    clear_parent_override: Joi.boolean().optional(),
});

const submitAchievementSchema = Joi.object({
    period_actual: Joi.number().min(0).allow(null).required(),
    narration: Joi.string().trim().max(1000).allow(null, "").optional(),
});

const submitAnnualAchievementSchema = Joi.object({
    annual_actual: Joi.number().min(0).allow(null).required(),
    narration: Joi.string().trim().max(1000).allow(null, "").optional(),
});

const rejectAchievementSchema = Joi.object({
    comment: Joi.string().trim().max(2000).allow(null, "").optional(),
});

const getPlanVersionsQuerySchema = Joi.object({
    year: Joi.number().integer().min(2000).max(2100).optional(),
    government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
    status: Joi.string().valid("draft", "active", "completed", "finalized", "locked").optional(),
    version_kind: Joi.string().valid("master", "annual", "execution_period").optional(),
    parent_plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
    search: Joi.string().trim().allow("").optional(),
    view: Joi.string().valid("summary", "full").optional(),
});

const getPlanExecutionDashboardQuerySchema = Joi.object({
    government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
    master_plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
    status: Joi.string().valid("all", "active", "completed", "delayed").optional(),
    sharing_mode: Joi.string().valid("all", "shared", "exclusive").optional(),
    search: Joi.string().trim().allow("").optional(),
    date_from: Joi.string().isoDate().optional(),
    date_to: Joi.string().isoDate().optional(),
});

/**
 * ================= PLAN NODE VALIDATORS =================
 */

const createPlanNodeSchema = Joi.object({
    plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "plan_version_id must be a valid UUID",
        "any.required": "plan_version_id is required",
    }),

    parent_id: optionalUuid("parent_id"),

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

    contribution_weight: Joi.number().min(0).max(100).allow(null).optional(),

    target_unit: Joi.string().trim().max(50).allow(null).optional(),

    level: Joi.number().integer().min(1).optional(),

    assignment_sharing_mode: Joi.string().valid("exclusive", "shared").default("exclusive").optional(),
});

const updatePlanNodeSchema = Joi.object({
    parent_id: optionalUuid("parent_id"),
    type: Joi.string().valid("strategic", "goal", "kpi", "task").optional(),
    title: Joi.string().trim().max(255).optional(),
    description: Joi.string().trim().optional().allow(null, ""),
    weight: Joi.number().min(0).optional(),
    weight_mode: Joi.string().valid("number", "percentage", "frequency").allow(null).optional(),
    contribution_weight: Joi.number().min(0).max(100).allow(null).optional(),
    target_unit: Joi.string().trim().max(50).allow(null).optional(),
    level: Joi.number().integer().min(1).optional(),
    order: Joi.forbidden().messages({
        "any.unknown": "Use the reorder endpoint to change node order on the draft master plan",
    }),
    is_active: Joi.boolean().optional(),
    assignment_sharing_mode: Joi.string().valid("exclusive", "shared").optional(),
});

const getPlanNodesQuerySchema = Joi.object({
    plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "any.required": "plan_version_id is required",
    }),
    type: Joi.string().valid("strategic", "goal", "kpi", "task").optional(),
    parent_id: optionalUuid("parent_id"),
    level: Joi.number().integer().min(1).optional(),
    is_active: Joi.boolean().optional(),
});

const reorderPlanNodesSchema = Joi.object({
    parent_id: optionalUuid("parent_id"),
    nodeOrders: Joi.array()
        .items(
            Joi.object({
                plan_node_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
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
    id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
        "string.guid": "ID must be a valid UUID",
        "any.required": "ID is required",
    }),
});

const versionIdParamSchema = Joi.object({
    plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required().messages({
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
    // Plan Version Validators
    validateCreatePlanVersion: validate(createPlanVersionSchema),
    validateUpdatePlanVersion: validate(updatePlanVersionSchema),
    validateUpdatePlanVersionStatus: validate(updatePlanVersionStatusSchema),
    validateDuplicatePlanDraft: validate(duplicatePlanDraftSchema),
    validateUpdateAnnualTarget: validate(updateAnnualTargetSchema),
    validateUpdatePeriodTarget: validate(updatePeriodTargetSchema),
    validateUpdatePeriodActual: validate(updatePeriodActualSchema),
    validateSubmitAchievement: validate(submitAchievementSchema),
    validateSubmitAnnualAchievement: validate(submitAnnualAchievementSchema),
    validateRejectAchievement: validate(rejectAchievementSchema),
    validateGetPlanVersionsQuery: validate(getPlanVersionsQuerySchema, "query"),
    validateGetPlanExecutionDashboardQuery: validate(
        getPlanExecutionDashboardQuerySchema,
        "query"
    ),

    // Plan Node Validators
    validateCreatePlanNode: validate(createPlanNodeSchema),
    validateUpdatePlanNode: validate(updatePlanNodeSchema),
    validateGetPlanNodesQuery: validate(getPlanNodesQuerySchema, "query"),
    validateReorderPlanNodes: validate(reorderPlanNodesSchema),

    // Param Validators
    validateIdParam: validate(idParamSchema, "params"),
    validateVersionIdParam: validate(versionIdParamSchema, "params"),
};