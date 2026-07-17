"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientAllergy extends Model {
    static associate(models) {
      PatientAllergy.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      PatientAllergy.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  PatientAllergy.init(
    {
      allergy_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      allergen: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      severity: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "MEDIUM",
      },
      reaction: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PatientAllergy",
      tableName: "patient_allergies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PatientAllergy;
};
