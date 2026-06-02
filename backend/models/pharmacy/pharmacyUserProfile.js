"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PharmacyUserProfile extends Model {
    static associate(models) {
      PharmacyUserProfile.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
      PharmacyUserProfile.belongsTo(models.Pharmacy, {
        foreignKey: "pharmacy_id",
        as: "pharmacy",
      });
    }
  }

  PharmacyUserProfile.init(
    {
      pharmacy_user_profile_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      pharmacy_id: { type: DataTypes.UUID, allowNull: false },
      portal_role: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "staff",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "PharmacyUserProfile",
      tableName: "pharmacy_user_profiles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PharmacyUserProfile;
};
