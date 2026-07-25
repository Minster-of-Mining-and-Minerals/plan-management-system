"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalResourceAssignment extends Model {
    static associate(models) {}
  }

  ClinicalResourceAssignment.init(
    {
      assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      resource_type: { type: DataTypes.STRING(64), allowNull: false },
      resource_id: { type: DataTypes.UUID, allowNull: false },
      assigned_to_type: { type: DataTypes.STRING(64), allowNull: false },
      assigned_to_id: { type: DataTypes.STRING(128), allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "ACTIVE" },
      start_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      end_time: { type: DataTypes.DATE, allowNull: true },
      priority: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "ROUTINE" },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalResourceAssignment",
      tableName: "clinical_resource_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalResourceAssignment;
};
