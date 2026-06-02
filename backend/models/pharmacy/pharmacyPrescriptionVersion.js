"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyPrescriptionVersion extends Model {
    static associate(models) {
      PharmacyPrescriptionVersion.belongsTo(models.PharmacyPrescription, {
        foreignKey: "pharmacy_prescription_id",
        as: "pharmacyPrescription",
      });
      PharmacyPrescriptionVersion.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  PharmacyPrescriptionVersion.init(
    {
      pharmacy_prescription_version_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pharmacy_prescription_id: { type: DataTypes.UUID, allowNull: false },
      version_number: { type: DataTypes.INTEGER, allowNull: false },
      status_before: { type: DataTypes.STRING(40), allowNull: true },
      status_after: { type: DataTypes.STRING(40), allowNull: false },
      change_summary: { type: DataTypes.TEXT, allowNull: true },
      items_snapshot: { type: DataTypes.JSONB, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "PharmacyPrescriptionVersion",
      tableName: "pharmacy_prescription_versions",
      timestamps: false,
      underscored: true,
    }
  );

  return PharmacyPrescriptionVersion;
};
