"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PlanNode extends Model {
        static associate(models) {
            // Belongs to PlanVersion
            PlanNode.belongsTo(models.PlanVersion, {
                foreignKey: "plan_version_id",
                as: "planVersion",
            });

            // Self hierarchy
            PlanNode.belongsTo(models.PlanNode, {
                foreignKey: "parent_id",
                as: "parent",
                onDelete: "CASCADE",
            });

            PlanNode.belongsTo(models.PlanNode, {
                foreignKey: "source_plan_node_id",
                as: "sourcePlanNode",
            });

            PlanNode.hasMany(models.PlanNode, {
                foreignKey: "parent_id",
                as: "children",
            });

            // Assignments
            PlanNode.hasMany(models.ExternalAssignment, {
                foreignKey: "plan_node_id",
                as: "externalAssignments",
            });

            PlanNode.hasMany(models.InternalAssignment, {
                foreignKey: "plan_node_id",
                as: "internalAssignments",
            });


        }
    }

    PlanNode.init(
        {
            plan_node_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            plan_version_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            parent_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            type: {
                type: DataTypes.ENUM("strategic", "goal", "kpi", "task"),
                allowNull: false,
            },

            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

      weight: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      weight_mode: {
        type: DataTypes.ENUM("number", "percentage", "frequency"),
        allowNull: true,
      },

      target_unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      level: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
            },

            order: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            assignment_sharing_mode: {
                type: DataTypes.ENUM("exclusive", "shared"),
                defaultValue: "exclusive",
                allowNull: false,
            },

            source_plan_node_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            annual_target: {
                type: DataTypes.FLOAT,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "PlanNode",
            tableName: "plan_nodes",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            paranoid: true,
            deletedAt: "deleted_at",

            indexes: [
                {
                    fields: ["plan_version_id"],
                },
                {
                    fields: ["parent_id"],
                },
                {
                    unique: true,
                    fields: ["parent_id", "title", "plan_version_id"],
                },
            ],
        }
    );

    return PlanNode;
};