"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalSuggestion extends Model {
    static associate(models) {
      ClinicalSuggestion.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
      ClinicalSuggestion.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
      ClinicalSuggestion.hasMany(models.UserSuggestionUsage, {
        foreignKey: "suggestion_id",
        as: "usageRows",
      });
    }
  }

  ClinicalSuggestion.init(
    {
      suggestion_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      text: { type: DataTypes.TEXT, allowNull: false },
      category: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "general",
      },
      department_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      frequency: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      organization_frequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_pinned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalSuggestion",
      tableName: "clinical_suggestions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalSuggestion;
};
