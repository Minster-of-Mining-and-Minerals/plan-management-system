"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalRecordVersion extends Model {
    static associate(models) {
      ClinicalRecordVersion.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "modifier",
      });
    }
  }

  ClinicalRecordVersion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      snapshot_json: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      change_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ClinicalRecordVersion",
      tableName: "clinical_record_versions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalRecordVersion;
};
