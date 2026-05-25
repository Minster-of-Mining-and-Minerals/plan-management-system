"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientProfile extends Model {
    static associate(models) {
      PatientProfile.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      PatientProfile.belongsTo(models.User, {
        foreignKey: "registered_by",
        as: "registrar",
      });
    }
  }

  PatientProfile.init(
    {
      patient_profile_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      patient_code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true,
      },
      qr_code: { type: DataTypes.TEXT, allowNull: true },
      barcode: { type: DataTypes.STRING(128), allowNull: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.STRING(32), allowNull: true },
      blood_group: { type: DataTypes.STRING(16), allowNull: true },
      marital_status: { type: DataTypes.STRING(32), allowNull: true },
      nationality: { type: DataTypes.STRING(64), allowNull: true },
      preferred_language: { type: DataTypes.STRING(32), allowNull: true },
      emergency_contacts: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      insurance_profile: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      medical_history_summary: { type: DataTypes.TEXT, allowNull: true },
      patient_status: {
        type: DataTypes.ENUM("active", "inactive", "deceased", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
      registered_by: { type: DataTypes.UUID, allowNull: true },
      registered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "PatientProfile",
      tableName: "patient_profiles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PatientProfile;
};
