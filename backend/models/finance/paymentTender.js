"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PaymentTender extends Model {
    static associate(models) {
      PaymentTender.belongsTo(models.CashierPayment, {
        foreignKey: "payment_id",
        as: "payment",
      });
    }
  }

  PaymentTender.init(
    {
      tender_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      payment_id: { type: DataTypes.UUID, allowNull: false },
      method: { type: DataTypes.STRING(32), allowNull: false },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      reference: { type: DataTypes.STRING(128), allowNull: true },
      provider: { type: DataTypes.STRING(64), allowNull: true },
    },
    {
      sequelize,
      modelName: "PaymentTender",
      tableName: "payment_tenders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return PaymentTender;
};
