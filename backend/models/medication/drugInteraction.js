"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DrugInteraction extends Model {
    static associate(models) {}
  }

  DrugInteraction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      medication_a_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      medication_b_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      severity: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "WARNING", // INFO, WARNING, SEVERE, CONTRAINDICATED
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      clinical_action: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "DrugInteraction",
      tableName: "drug_interactions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return DrugInteraction;
};
