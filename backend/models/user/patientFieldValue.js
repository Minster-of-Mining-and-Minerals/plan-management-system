"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PatientFieldValue extends Model {
    static associate(models) {
      PatientFieldValue.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  PatientFieldValue.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      field_key: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PatientFieldValue",
      tableName: "patient_field_values",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
      indexes: [
        { fields: ["user_id"] },
        { unique: true, fields: ["user_id", "field_key"] },
      ],
    }
  );

  return PatientFieldValue;
};
