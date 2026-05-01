// models/userPermissionGroup.js
"use strict";

module.exports = (sequelize, DataTypes) => {
    const UserPermissionGroup = sequelize.define(
        "UserPermissionGroup",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            permission_group_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "user_permission_groups",
            timestamps: false,
        }
    );

    return UserPermissionGroup;
};