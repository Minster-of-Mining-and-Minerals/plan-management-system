"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class InternalAssignment extends Model {
        static associate(models) {
            InternalAssignment.belongsTo(models.PlanAssignmentAction, {
                foreignKey: "action_id",
                targetKey: "assignment_action_id",
                as: "action",
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
                allowNull: false,
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
            ],
            validate: {
                eitherUserOrStructure() {
                    if (!this.user_id && !this.internal_structure_id) {
                        throw new Error("Must assign to either user or internal structure");
                    }
                },

                notBothUserAndStructure() {
                    if (this.user_id && this.internal_structure_id) {
                        throw new Error("Cannot assign to both user and internal structure simultaneously");
                    }
                },
            },
        }
    );

    return InternalAssignment;
};