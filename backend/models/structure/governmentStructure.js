"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class GovernmentStructure extends Model {
        static associate(models) {
            // Self-referencing hierarchy (parent → children)
            GovernmentStructure.belongsTo(models.GovernmentStructure, {
                foreignKey: "parent_id",
                as: "parent",
            });

            GovernmentStructure.hasMany(models.GovernmentStructure, {
                foreignKey: "parent_id",
                as: "children",
            });

            // One government structure has many users
            GovernmentStructure.hasMany(models.User, {
                foreignKey: "government_structure_id",
                as: "users",
            });

            // One government structure has many permission groups
            GovernmentStructure.belongsToMany(models.PermissionGroup, {
                through: models.GovernmentStructurePermissionGroup,
                foreignKey: "government_structure_id",
                otherKey: "permission_group_id",
                as: "permissionGroups",
            });
        }
    }

    GovernmentStructure.init(
        {
            government_structure_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            parent_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            level: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            logo_path: {
                type: DataTypes.STRING(500),
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "GovernmentStructure",
            tableName: "government_structures",
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
            deletedAt: "deleted_at",
            paranoid: true,

            indexes: [
                {
                    fields: ["parent_id", "name"],
                },
            ],
        }
    );

    return GovernmentStructure;
};