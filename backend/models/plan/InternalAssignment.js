"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class InternalAssignment extends Model {
        static associate(models) {
            InternalAssignment.belongsTo(models.PlanAssignmentAction, {
                foreignKey: "action_id",
                targetKey: "assignment_action_id",
                as: "action",
                required: false,
            });

            InternalAssignment.belongsTo(models.PlanNode, {
                foreignKey: "plan_node_id",
                as: "planNode",
            });

            InternalAssignment.belongsTo(models.InternalStructure, {
                foreignKey: "internal_structure_id",
                as: "internalStructure",
            });

            InternalAssignment.belongsTo(models.User, {
                foreignKey: "user_id",
                as: "user",
            });

            InternalAssignment.belongsTo(models.Role, {
                foreignKey: "role_id",
                as: "role",
            });

            InternalAssignment.belongsTo(models.PermissionGroup, {
                foreignKey: "permission_group_id",
                as: "permissionGroup",
            });

            InternalAssignment.belongsTo(models.ExternalAssignment, {
                foreignKey: "branch_external_assignment_id",
                as: "branchExternalAssignment",
            });

            InternalAssignment.belongsTo(models.InternalAssignment, {
                foreignKey: "branch_internal_assignment_id",
                as: "branchInternalAssignment",
            });
        }
    }

    InternalAssignment.init(
        {
            internal_assignment_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            plan_node_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            internal_structure_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            user_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            action_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            role_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            permission_group_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            branch_external_assignment_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            branch_internal_assignment_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "InternalAssignment",
            tableName: "internal_assignments",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",

            indexes: [
                {
                    fields: ["plan_node_id"],
                },
                {
                    fields: ["internal_structure_id"],
                },
                {
                    fields: ["user_id"],
                },
                {
                    fields: ["role_id"],
                },
                {
                    fields: ["permission_group_id"],
                },
            ],
            validate: {
                exactlyOneAssignmentTarget() {
                    const targets = [
                        this.user_id,
                        this.internal_structure_id,
                        this.role_id,
                        this.permission_group_id,
                    ].filter(Boolean);

                    if (targets.length !== 1) {
                        throw new Error(
                            "Assignment must target exactly one of user, department, role, or permission group."
                        );
                    }
                },
            },
        }
    );

    return InternalAssignment;
};