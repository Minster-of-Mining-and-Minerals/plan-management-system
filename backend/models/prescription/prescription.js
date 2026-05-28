"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Prescription extends Model {
    static associate(models) {
      Prescription.belongsTo(models.PrescriptionCategory, {
        foreignKey: "category_id",
        as: "category",
      });
      Prescription.belongsTo(models.PrescriptionTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
      Prescription.belongsTo(models.PrescriptionDocumentTemplate, {
        foreignKey: "document_template_id",
        as: "documentTemplate",
      });
      Prescription.hasMany(models.PrescriptionItem, {
        foreignKey: "prescription_id",
        as: "items",
      });
      Prescription.belongsTo(models.User, {
        foreignKey: "prescriber_id",
        as: "prescriber",
      });
      Prescription.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
    }
  }

  Prescription.init(
    {
      prescription_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointment_id: { type: DataTypes.UUID, allowNull: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      prescriber_id: { type: DataTypes.UUID, allowNull: false },
      category_id: { type: DataTypes.UUID, allowNull: true },
      template_id: { type: DataTypes.UUID, allowNull: true },
      document_template_id: { type: DataTypes.UUID, allowNull: true },
      header_title: { type: DataTypes.STRING(255), allowNull: true },
      signature_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "template",
      },
      rendered_html: { type: DataTypes.TEXT, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "issued",
      },
      issued_at: { type: DataTypes.DATE, allowNull: true },
      workflow_log_id: { type: DataTypes.UUID, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "Prescription",
      tableName: "prescriptions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return Prescription;
};
