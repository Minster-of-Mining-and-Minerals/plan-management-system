"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalShift extends Model {
    static associate(models) {
      ClinicalShift.belongsTo(models.User, {
        foreignKey: "provider_id",
        as: "provider",
      });
    }
  }

  ClinicalShift.init(
    {
      shift_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      provider_id: { type: DataTypes.UUID, allowNull: false },
      department_id: { type: DataTypes.STRING(64), allowNull: false },
      start_time: { type: DataTypes.DATE, allowNull: false },
      end_time: { type: DataTypes.DATE, allowNull: false },
      shift_type: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "MORNING" },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "SCHEDULED" },
    },
    {
      sequelize,
      modelName: "ClinicalShift",
      tableName: "clinical_shifts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalShift;
};
