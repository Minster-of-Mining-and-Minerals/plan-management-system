"use strict";

const Joi = require("joi");

/**
 * =================== CREATE ===================
 */
const createPermissionGroupSchema = Joi.object({
    name: Joi.string().trim().min(2).max(150).required().messages({
        "string.empty": "Permission group name is required",
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name must not exceed 150 characters",
    }),

    description: Joi.string().allow("", null).optional(),

    is_active: Joi.boolean().optional(),

    permission_ids: Joi.array()
        .items(
            Joi.string().guid({ version: "uuidv4" }).messages({
                "string.guid": "Each permission_id must be a valid UUID",
            })
        )
        .optional(),

    user_ids: Joi.array()
        .items(
            Joi.string().guid({ version: "uuidv4" }).messages({
                "string.guid": "Each user_id must be a valid UUID",
            })
        )
        .optional(),

    government_structure_ids: Joi.array()
        .items(
            Joi.string().guid({ version: "uuidv4" }).messages({
                "string.guid":
                    "Each government_structure_id must be a valid UUID",
            })
        )
        .optional(),
});

/**
 * =================== UPDATE ===================
 */
const updatePermissionGroupSchema = Joi.object({
    name: Joi.string().trim().min(2).max(150).optional(),
    description: Joi.string().allow("", null).optional(),
    is_active: Joi.boolean().optional(),
    permission_ids: Joi.array()
        .items(
            Joi.string().guid({ version: "uuidv4" }).messages({
                "string.guid": "Each permission_id must be a valid UUID",
            })
        )
        .optional(),
});

/**
 * =================== ADD PERMISSIONS ===================
 */
const addPermissionsSchema = Joi.object({
    permission_group_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),

    permission_ids: Joi.array()
        .items(Joi.string().guid({ version: "uuidv4" }))
        .min(1)
        .required(),
});

/**
 * =================== REMOVE PERMISSION ===================
 */
const removePermissionSchema = Joi.object({
    permission_group_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),

    permission_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),
});

/**
 * =================== USER ASSIGN ===================
 */
const addUsersSchema = Joi.object({
    permission_group_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),

    user_ids: Joi.array()
        .items(Joi.string().guid({ version: "uuidv4" }))
        .min(1)
        .required(),
});

const removeUserSchema = Joi.object({
    permission_group_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),

    user_id: Joi.string().guid({ version: "uuidv4" }).required(),
});

/**
 * =================== STRUCTURE ASSIGN ===================
 */
const addStructuresSchema = Joi.object({
    permission_group_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),

    government_structure_ids: Joi.array()
        .items(Joi.string().guid({ version: "uuidv4" }))
        .min(1)
        .required(),
});

const removeStructureSchema = Joi.object({
    permission_group_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),

    government_structure_id: Joi.string()
        .guid({ version: "uuidv4" })
        .required(),
});

/**
 * =================== WRAPPERS ===================
 */
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

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
    validateCreatePermissionGroup: validate(createPermissionGroupSchema),
    validateUpdatePermissionGroup: validate(updatePermissionGroupSchema),

    validateAddPermissions: validate(addPermissionsSchema),
    validateRemovePermission: validate(removePermissionSchema),

    validateAddUsers: validate(addUsersSchema),
    validateRemoveUser: validate(removeUserSchema),

    validateAddStructures: validate(addStructuresSchema),
    validateRemoveStructure: validate(removeStructureSchema),
};