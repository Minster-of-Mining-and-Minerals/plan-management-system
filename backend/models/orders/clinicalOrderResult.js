"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalOrderResult extends Model {
    static associate(models) {
      ClinicalOrderResult.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      ClinicalOrderResult.belongsTo(models.User, {
        foreignKey: "recorded_by",
        as: "recordedByUser",
      });
      ClinicalOrderResult.belongsTo(models.User, {
        foreignKey: "verified_by",
        as: "verifiedByUser",
      });
      ClinicalOrderResult.hasMany(models.ClinicalOrderResultHistory, {
        foreignKey: "result_id",
        as: "amendmentHistory",
      });
      ClinicalOrderResult.hasMany(models.LaboratoryObservation, {
        foreignKey: "result_id",
        as: "observations",
      });
    }
  }

  ClinicalOrderResult.init(
    {
      result_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      order_id: { type: DataTypes.UUID, allowNull: false },
      recorded_by: { type: DataTypes.UUID, allowNull: false },
      verified_by: { type: DataTypes.UUID, allowNull: true },
      verification_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "FINAL",
      },
      result_summary: { type: DataTypes.TEXT, allowNull: true },
      result_data: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
      recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      verified_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalOrderResult",
      tableName: "clinical_order_results",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalOrderResult;
};
