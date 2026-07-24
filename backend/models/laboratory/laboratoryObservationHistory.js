"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratoryObservationHistory extends Model {
    static associate(models) {
      LaboratoryObservationHistory.belongsTo(models.LaboratoryObservation, {
        foreignKey: "observation_id",
        as: "observation",
      });
      LaboratoryObservationHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  LaboratoryObservationHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      observation_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_value: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      previous_unit: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      previous_flag: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      change_reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "LaboratoryObservationHistory",
      tableName: "laboratory_observation_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratoryObservationHistory;
};
