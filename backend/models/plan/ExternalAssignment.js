"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ExternalAssignment extends Model {
        static associate(models) {
            ExternalAssignment.belongsTo(models.PlanNode, {
                foreignKey: "plan_node_id",
                as: "planNode",
            });

            ExternalAssignment.belongsTo(models.GovernmentStructure, {
                foreignKey: "government_structure_id",
                as: "governmentStructure",
            });
        }
    }

    ExternalAssignment.init(
        {
            external_assignment_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            plan_node_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            government_structure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            is_visible: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            requires_report: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },
        },
        {
            sequelize,
            modelName: "ExternalAssignment",
            tableName: "external_assignments",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",

            indexes: [
                {
                    fields: ["plan_node_id"],
                },
                {
                    fields: ["government_structure_id"],
                },
                {
                    unique: true,
                    fields: ["plan_node_id", "government_structure_id"],
                },
            ],
        }
    );

    return ExternalAssignment;
};