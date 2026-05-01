"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PlanNodeActionLog extends Model {
        static associate(models) {
            PlanNodeActionLog.belongsTo(models.PlanNode, {
                foreignKey: "plan_node_id",
                as: "planNode",
            });

            PlanNodeActionLog.belongsTo(models.User, {
                foreignKey: "user_id",
                as: "user",
            });

            PlanNodeActionLog.belongsTo(models.PlanAssignmentAction, {
                foreignKey: "action_id",
                as: "action",
            });
        }
    }

    PlanNodeActionLog.init(
        {
            action_log_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            plan_node_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            action_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            comment: {
                type: DataTypes.TEXT,
            },

            status: {
                type: DataTypes.ENUM(
                    "pending",
                    "submitted",
                    "approved",
                    "rejected",
                    "forwarded"
                ),
                defaultValue: "pending",
            },
        },
        {
            sequelize,
            modelName: "PlanNodeActionLog",
            tableName: "plan_node_action_logs",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: false,
        }
    );

    return PlanNodeActionLog;
};