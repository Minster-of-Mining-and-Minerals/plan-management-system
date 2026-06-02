"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PrescriptionPharmacyForwardAudit extends Model {
    static associate(models) {
      PrescriptionPharmacyForwardAudit.belongsTo(
        models.PrescriptionPharmacyForward,
        { foreignKey: "forward_id", as: "forward" }
      );
      PrescriptionPharmacyForwardAudit.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changer",
      });
    }
  }

  PrescriptionPharmacyForwardAudit.init(
    {
      audit_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      forward_id: { type: DataTypes.UUID, allowNull: false },
      action: { type: DataTypes.STRING(48), allowNull: false },
      changed_by: { type: DataTypes.UUID, allowNull: false },
      changed_at: { type: DataTypes.DATE, allowNull: false },
      previous_values: { type: DataTypes.JSONB, allowNull: true },
      new_values: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      sequelize,
      modelName: "PrescriptionPharmacyForwardAudit",
      tableName: "prescription_pharmacy_forward_audits",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PrescriptionPharmacyForwardAudit;
};
