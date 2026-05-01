// models/governmentStructurePermissionGroup.js
"use strict";

module.exports = (sequelize, DataTypes) => {
    const GovernmentStructurePermissionGroup = sequelize.define(
        "GovernmentStructurePermissionGroup",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            government_structure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            permission_group_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "government_structure_permission_groups",
            timestamps: false,
        }
    );

    return GovernmentStructurePermissionGroup;
};