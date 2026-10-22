"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PermissionGroup extends Model {
        static associate(models) {
            // Many-to-many with Permissions
            PermissionGroup.belongsToMany(models.Permission, {
                through: models.PermissionGroupPermission,
                foreignKey: "permission_group_id",
                otherKey: "permission_id",
                as: "permissions",
            });

            // Many-to-many with Users
            PermissionGroup.belongsToMany(models.User, {
                through: models.UserPermissionGroup,
                foreignKey: "permission_group_id",
                otherKey: "user_id",
                as: "users",
            });

            // Many-to-many with GovernmentStructure
            PermissionGroup.belongsToMany(models.GovernmentStructure, {
                through: models.GovernmentStructurePermissionGroup,
                foreignKey: "permission_group_id",
                otherKey: "government_structure_id",
                as: "structures",
            });

            // Special groups: department members (exact match, no inheritance)
            PermissionGroup.belongsToMany(models.InternalStructure, {
                through: models.InternalStructurePermissionGroup,
                foreignKey: "permission_group_id",
                otherKey: "internal_structure_id",
                as: "internalStructures",
            });

            // Region association for regional permission groups
            PermissionGroup.belongsTo(models.Region, {
                foreignKey: "region_id",
                as: "region",
            });
        }
    }

    PermissionGroup.init(
        {
            permission_group_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },

            name: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            region_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
            },

            group_kind: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "standard",
            },

            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },

            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            modelName: "PermissionGroup",
            tableName: "permission_groups",
            timestamps: false,
            underscored: true,
        }
    );

    return PermissionGroup;
};