"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CashierSession extends Model {
    static associate(models) {
      CashierSession.belongsTo(models.User, {
        foreignKey: "cashier_user_id",
        as: "cashier",
      });
      CashierSession.hasMany(models.CashierPayment, {
        foreignKey: "session_id",
        as: "payments",
      });
    }
  }

  CashierSession.init(
    {
      session_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      cashier_user_id: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "open",
      },
      opening_float: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      expected_cash_total: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      counted_cash_total: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      variance: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      close_notes: { type: DataTypes.TEXT, allowNull: true },
      opened_at: { type: DataTypes.DATE, allowNull: false },
      closed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "CashierSession",
      tableName: "cashier_sessions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return CashierSession;
};
