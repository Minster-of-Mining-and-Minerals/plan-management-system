"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ReceiptSequence extends Model {}

  ReceiptSequence.init(
    {
      sequence_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      facility_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "default",
      },
      year: { type: DataTypes.INTEGER, allowNull: false },
      last_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "ReceiptSequence",
      tableName: "receipt_sequences",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ReceiptSequence;
};
