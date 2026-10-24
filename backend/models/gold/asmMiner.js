"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AsmMiner extends Model {
    static associate(models) {
      // An ASM miner has many gold purchases
      AsmMiner.hasMany(models.GoldPurchase, {
        foreignKey: "asm_id",
        as: "purchases",
      });

      // Originating purchasing center (for audit/source metadata, not ownership)
      AsmMiner.belongsTo(models.PurchasingCenter, {
        foreignKey: "registered_center_id",
        as: "registeredCenter",
      });

      // User account that registered this miner
      AsmMiner.belongsTo(models.User, {
        foreignKey: "registered_by_id",
        as: "registeredBy",
      });
    }
  }

  AsmMiner.init(
    {
      asm_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      national_id_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      mining_license_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      region: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      zone_or_woreda: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      kebele: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      registered_center_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      registered_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "AsmMiner",
      tableName: "asm_miners",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        { fields: ["full_name"] },
        { fields: ["phone_number"] },
        { fields: ["is_active"] },
      ],
    }
  );

  return AsmMiner;
};
