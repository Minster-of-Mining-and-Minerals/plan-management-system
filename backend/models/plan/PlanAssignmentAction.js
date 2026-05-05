"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PlanAssignmentAction extends Model {
        static associate(models) {
            PlanAssignmentAction.hasMany(models.InternalAssignment, {
                foreignKey: "action_id",
                as: "assignments",
            });
        }
    }

    PlanAssignmentAction.init(
        {
            assignment_action_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },

            description: {
                type: DataTypes.TEXT,
            },

            // optional: behavior flags
            is_approval: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            is_execution: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },

            is_reporting: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
        },
        {
            sequelize,
            modelName: "PlanAssignmentAction",
            tableName: "plan_assignment_actions",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    );

    return PlanAssignmentAction;
};