"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyInternalAssignment extends Model {
    static associate(models) {
      CompanyInternalAssignment.belongsTo(models.CompanyPlanNode, {
        foreignKey: "company_plan_node_id",
        as: "planNode",
        onDelete: "CASCADE",
      });

      CompanyInternalAssignment.belongsTo(models.CompanyStructure, {
        foreignKey: "company_structure_id",
        as: "department",
        onDelete: "CASCADE",
      });

      CompanyInternalAssignment.belongsTo(models.User, {
        foreignKey: "assigned_user_id",
        as: "assignedUser",
      });
    }
  }

  CompanyInternalAssignment.init(
    {
      company_internal_assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      company_structure_id: {
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
      modelName: "CompanyInternalAssignment",
      tableName: "company_internal_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return CompanyInternalAssignment;
};
