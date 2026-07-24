"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratorySpecimenStatusHistory extends Model {
    static associate(models) {
      LaboratorySpecimenStatusHistory.belongsTo(models.LaboratorySpecimen, {
        foreignKey: "specimen_id",
        as: "specimen",
      });
      LaboratorySpecimenStatusHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  LaboratorySpecimenStatusHistory.init(
    {
      specimen_status_history_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      specimen_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_status: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      new_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "LaboratorySpecimenStatusHistory",
      tableName: "laboratory_specimen_status_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratorySpecimenStatusHistory;
};
