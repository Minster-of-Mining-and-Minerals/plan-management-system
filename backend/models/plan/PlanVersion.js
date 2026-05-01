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

            // Has many PlanNodes
            PlanVersion.hasMany(models.PlanNode, {
                foreignKey: "plan_version_id",
                as: "planNodes",
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
                type: DataTypes.ENUM("draft", "active", "completed"),
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