"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalInternalAssignment extends Model {
    static associate(models) {
      RegionalInternalAssignment.belongsTo(models.RegionalPlanNode, {
        foreignKey: "regional_plan_node_id",
        as: "planNode",
        onDelete: "CASCADE",
      });

      RegionalInternalAssignment.belongsTo(models.RegionalStructure, {
        foreignKey: "regional_structure_id",
        as: "department",
        onDelete: "CASCADE",
      });

      RegionalInternalAssignment.belongsTo(models.User, {
        foreignKey: "assigned_user_id",
        as: "assignedUser",
      });
    }
  }

  RegionalInternalAssignment.init(
    {
      regional_internal_assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regional_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      regional_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assigned_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "RegionalInternalAssignment",
      tableName: "regional_internal_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RegionalInternalAssignment;
};
