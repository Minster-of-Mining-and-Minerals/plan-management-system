"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PermissionGroup extends Model {
        static associate(models) {
            PermissionGroup.belongsToMany(models.Permission, {
                through: models.PermissionGroupPermission,
                foreignKey: "permission_group_id",
                otherKey: "permission_id",
                as: "permissions",
            });

            PermissionGroup.belongsToMany(models.User, {
                through: models.UserPermissionGroup,
                foreignKey: "permission_group_id",
                otherKey: "user_id",
                as: "users",
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

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
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
