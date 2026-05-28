"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DiagnosisTemplate extends Model {
    static associate(models) {
      DiagnosisTemplate.hasMany(models.FormFieldGroup, {
        foreignKey: "diagnosis_template_id",
        as: "groups",
      });
      DiagnosisTemplate.hasMany(models.DiagnosisFormConfig, {
        foreignKey: "source_template_id",
        as: "staffConfigs",
      });
      DiagnosisTemplate.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  DiagnosisTemplate.init(
    {
      template_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "DiagnosisTemplate",
      tableName: "diagnosis_templates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return DiagnosisTemplate;
};
