"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicationFormularyRule extends Model {
    static associate(models) {
      MedicationFormularyRule.belongsTo(models.MedicationCatalog, {
        foreignKey: "medication_catalog_id",
        as: "medicationCatalog",
      });
      MedicationFormularyRule.belongsTo(models.MedicationCatalog, {
        foreignKey: "preferred_alternative_id",
        as: "preferredAlternative",
      });
    }
  }

  MedicationFormularyRule.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      medication_catalog_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      department_restriction: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      requires_approval: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      doctor_authorization_level: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      preferred_alternative_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MedicationFormularyRule",
      tableName: "medication_formulary_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicationFormularyRule;
};
