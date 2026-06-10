"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PlanVersion extends Model {
        static associate(models) {
            // Belongs to GovernmentStructure
            PlanVersion.belongsTo(models.GovernmentStructure, {
                foreignKey: "government_structure_id",
                as: "governmentStructure",
            });

            // Self reference (carry forward)
            PlanVersion.belongsTo(models.PlanVersion, {
                foreignKey: "based_on_version_id",
                as: "baseVersion",
            });

            PlanVersion.belongsTo(models.PlanVersion, {
                foreignKey: "parent_plan_version_id",
                as: "parentPlanVersion",
            });

            PlanVersion.hasMany(models.PlanVersion, {
                foreignKey: "parent_plan_version_id",
                as: "annualVersions",
            });

            PlanVersion.belongsTo(models.PlanRule, {
                foreignKey: "plan_rule_id",
                as: "planRule",
            });

            // Has many PlanNodes
            PlanVersion.hasMany(models.PlanNode, {
                foreignKey: "plan_version_id",
                as: "planNodes",
                onDelete: "CASCADE",
            });
        }
    }

    PlanVersion.init(
        {
            plan_version_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            year: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            version_number: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },

            status: {
                type: DataTypes.ENUM("draft", "active", "completed", "finalized", "locked"),
                defaultValue: "draft",
            },

            government_structure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            based_on_version_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            plan_rule_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            version_kind: {
                type: DataTypes.ENUM("master", "annual"),
                allowNull: false,
                defaultValue: "master",
            },

            parent_plan_version_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            planning_year: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            sequence_index: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },

            is_locked: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            finalized_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            draft_name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            start_year: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            end_year: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            planning_duration_years: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            planning_start_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },

            planning_end_date: {
                type: DataTypes.DATEONLY,
                allowNull: false,
            },

            start_month: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            end_month: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "PlanVersion",
            tableName: "plan_versions",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",

            indexes: [
                {
                    unique: true,
                    fields: ["year", "version_number", "government_structure_id"],
                },
            ],
        }
    );

    return PlanVersion;
};