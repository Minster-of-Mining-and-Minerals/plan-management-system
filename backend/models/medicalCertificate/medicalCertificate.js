"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MedicalCertificate extends Model {
    static associate(models) {
      MedicalCertificate.belongsTo(models.MedicalCertificateTemplate, {
        foreignKey: "template_id",
        as: "template",
      });
      MedicalCertificate.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      MedicalCertificate.belongsTo(models.User, {
        foreignKey: "issued_by",
        as: "issuer",
      });
      MedicalCertificate.belongsTo(models.PatientSchedule, {
        foreignKey: "schedule_id",
        as: "schedule",
      });
      MedicalCertificate.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
    }
  }

  MedicalCertificate.init(
    {
      certificate_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      certificate_number: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      schedule_id: { type: DataTypes.UUID, allowNull: true },
      appointment_id: { type: DataTypes.UUID, allowNull: true },
      template_id: { type: DataTypes.UUID, allowNull: false },
      include_options: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      doctor_notes: { type: DataTypes.TEXT, allowNull: true },
      rendered_html: { type: DataTypes.TEXT, allowNull: false },
      signature_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "template",
      },
      verification_code: { type: DataTypes.STRING(64), allowNull: true },
      issued_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "MedicalCertificate",
      tableName: "medical_certificates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return MedicalCertificate;
};
