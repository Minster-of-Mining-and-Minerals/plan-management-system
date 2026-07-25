"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalIncident extends Model {
    static associate(models) {
      ClinicalIncident.belongsTo(models.User, {
        foreignKey: "assigned_to_user_id",
        as: "assignedUser",
      });
      ClinicalIncident.hasMany(models.ClinicalOperationalMessage, {
        foreignKey: "incident_id",
        as: "messages",
      });
    }
  }

  ClinicalIncident.init(
    {
      incident_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      incident_type: { type: DataTypes.STRING(64), allowNull: false },
      severity: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "MEDIUM" },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "OPEN" },
      department_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "HOSPITAL" },
      assigned_to_user_id: { type: DataTypes.UUID, allowNull: true },
      assigned_owner_role: { type: DataTypes.STRING(64), allowNull: true },
      source_entity_type: { type: DataTypes.STRING(64), allowNull: true },
      source_entity_id: { type: DataTypes.STRING(128), allowNull: true },
      root_cause: { type: DataTypes.TEXT, allowNull: true },
      resolution_notes: { type: DataTypes.TEXT, allowNull: true },
      acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalIncident",
      tableName: "clinical_incidents",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalIncident;
};
