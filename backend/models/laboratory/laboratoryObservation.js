"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratoryObservation extends Model {
    static associate(models) {
      LaboratoryObservation.belongsTo(models.ClinicalOrderResult, {
        foreignKey: "result_id",
        as: "clinicalOrderResult",
      });
      LaboratoryObservation.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      LaboratoryObservation.belongsTo(models.LaboratoryTestCatalog, {
        foreignKey: "test_catalog_id",
        as: "testCatalog",
      });
      LaboratoryObservation.belongsTo(models.User, {
        foreignKey: "observed_by",
        as: "observedByUser",
      });
      LaboratoryObservation.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verifiedByUser",
      });
      LaboratoryObservation.hasMany(models.LaboratoryObservationHistory, {
        foreignKey: "observation_id",
        as: "amendments",
      });
    }
  }

  LaboratoryObservation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      result_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      test_catalog_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      observation_code: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      observation_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      value: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      numeric_value: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      unit: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      reference_range: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      abnormal_flag: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "NORMAL",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PRELIMINARY",
      },
      observed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      verified_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      observed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "LaboratoryObservation",
      tableName: "laboratory_observations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratoryObservation;
};
