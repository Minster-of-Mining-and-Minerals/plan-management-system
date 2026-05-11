// models/structurePermissionGroup.js
"use strict";

module.exports = (sequelize, DataTypes) => {
    const StructurePermissionGroup = sequelize.define(
        "StructurePermissionGroup",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            structure_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            permission_group_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "structure_permission_groups",
            timestamps: false,
        }
    );

    return StructurePermissionGroup;
};