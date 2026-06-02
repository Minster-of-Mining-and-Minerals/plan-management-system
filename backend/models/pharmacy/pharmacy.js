"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Pharmacy extends Model {
    static associate(models) {
      Pharmacy.hasMany(models.PharmacyUserProfile, {
        foreignKey: "pharmacy_id",
        as: "users",
      });
      Pharmacy.hasMany(models.PharmacyPrescription, {
        foreignKey: "pharmacy_id",
        as: "prescriptions",
      });
      Pharmacy.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  Pharmacy.init(
    {
      pharmacy_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      pharmacy_name: { type: DataTypes.STRING(200), allowNull: false },
      pharmacy_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      license_number: { type: DataTypes.STRING(100), allowNull: true },
      phone: { type: DataTypes.STRING(50), allowNull: true },
      email: { type: DataTypes.STRING(255), allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: true },
      region: { type: DataTypes.STRING(100), allowNull: true },
      country: { type: DataTypes.STRING(100), allowNull: true },
      contact_person: { type: DataTypes.STRING(150), allowNull: true },
      logo: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "Pharmacy",
      tableName: "pharmacies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return Pharmacy;
};
