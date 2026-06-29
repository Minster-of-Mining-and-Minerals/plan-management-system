"use strict";

module.exports = (sequelize, DataTypes) => {
  const InternalStructurePermissionGroup = sequelize.define(
    "InternalStructurePermissionGroup",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      internal_structure_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      permission_group_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "internal_structure_permission_groups",
      timestamps: false,
    }
  );

  InternalStructurePermissionGroup.associate = function associate(models) {
    InternalStructurePermissionGroup.belongsTo(models.InternalStructure, {
      foreignKey: "internal_structure_id",
      as: "internalStructure",
    });

    InternalStructurePermissionGroup.belongsTo(models.PermissionGroup, {
      foreignKey: "permission_group_id",
      as: "permissionGroup",
    });
  };

  return InternalStructurePermissionGroup;
};
