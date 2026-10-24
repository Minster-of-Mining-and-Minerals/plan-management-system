"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GoldPurchase extends Model {
    static associate(models) {
      // Belongs to exactly one purchasing center
      GoldPurchase.belongsTo(models.PurchasingCenter, {
        foreignKey: "purchasing_center_id",
        as: "purchasingCenter",
      });

      // Optional Company seller (when seller_type = 'company')
      GoldPurchase.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "companySeller",
      });

      // Optional ASM miner seller (when seller_type = 'asm')
      GoldPurchase.belongsTo(models.AsmMiner, {
        foreignKey: "asm_id",
        as: "asmSeller",
      });

      // Associated measurement unit
      GoldPurchase.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "measurement_unit_id",
        as: "measurementUnit",
      });

      // Associated price configuration (if unit price was derived from official rate)
      GoldPurchase.belongsTo(models.GoldPriceConfiguration, {
        foreignKey: "price_configuration_id",
        as: "priceConfiguration",
      });

      // Recorded by user
      GoldPurchase.belongsTo(models.User, {
        foreignKey: "created_by_id",
        as: "createdBy",
      });

      // Updated by user
      GoldPurchase.belongsTo(models.User, {
        foreignKey: "updated_by_id",
        as: "updatedBy",
      });

      // Cancelled by user
      GoldPurchase.belongsTo(models.User, {
        foreignKey: "cancelled_by_id",
        as: "cancelledBy",
      });
    }
  }

  GoldPurchase.init(
    {
      purchase_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchase_reference: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      purchasing_center_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      seller_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [["company", "asm"]],
        },
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      asm_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      seller_name_snapshot: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      seller_identifier_snapshot: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      purchase_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      business_date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        validate: {
          min: 0.0001,
        },
      },
      measurement_unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      unit_code_snapshot: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      conversion_factor_snapshot: {
        type: DataTypes.DECIMAL(18, 6),
        allowNull: false,
        defaultValue: 1.0,
      },
      quantity_in_canonical_unit: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        validate: {
          min: 0.0001,
        },
      },
      unit_price: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      total_amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "ETB",
      },
      gold_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      karat: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      quality_grade: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      purity_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      is_custom_price: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      price_configuration_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "completed",
        validate: {
          isIn: [["completed", "cancelled"]],
        },
      },
      cancelled_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelled_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      created_by_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      updated_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GoldPurchase",
      tableName: "gold_purchases",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        { fields: ["purchasing_center_id", "business_date"] },
        { fields: ["business_date"] },
        { fields: ["company_id"] },
        { fields: ["asm_id"] },
        { fields: ["status"] },
      ],
    }
  );

  return GoldPurchase;
};
