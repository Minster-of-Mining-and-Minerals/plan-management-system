"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PermissionGroupPermission extends Model {
        static associate(models) {
            // optional (usually not needed for pure junction tables)
            PermissionGroupPermission.belongsTo(models.PermissionGroup, {
                foreignKey: "permission_group_id",
                as: "permissionGroup",
            });

            PermissionGroupPermission.belongsTo(models.Permission, {
                foreignKey: "permission_id",
                as: "permission",
            });
        }
    }

    PermissionGroupPermission.init(
        {
            permission_group_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            permission_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            modelName: "PermissionGroupPermission",
            tableName: "permission_group_permissions",
            timestamps: false,
            underscored: true,
        }
    );

    return PermissionGroupPermission;
};