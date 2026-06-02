"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionPharmacyForwardFile extends Model {
    static associate(models) {
      PrescriptionPharmacyForwardFile.belongsTo(
        models.PrescriptionPharmacyForward,
        { foreignKey: "forward_id", as: "forward" }
      );
      PrescriptionPharmacyForwardFile.belongsTo(models.Attachment, {
        foreignKey: "attachment_id",
        as: "attachment",
      });
      PrescriptionPharmacyForwardFile.belongsTo(models.User, {
        foreignKey: "added_by",
        as: "adder",
      });
    }
  }

  PrescriptionPharmacyForwardFile.init(
    {
      forward_file_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      forward_id: { type: DataTypes.UUID, allowNull: false },
      attachment_id: { type: DataTypes.UUID, allowNull: false },
      added_by: { type: DataTypes.UUID, allowNull: false },
      added_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "PrescriptionPharmacyForwardFile",
      tableName: "prescription_pharmacy_forward_files",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionPharmacyForwardFile;
};
