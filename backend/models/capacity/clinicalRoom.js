"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalRoom extends Model {
    static associate(models) {
      ClinicalRoom.hasMany(models.ClinicalResourceAssignment, {
        foreignKey: "resource_id",
        constraints: false,
        as: "assignments",
      });
    }
  }

  ClinicalRoom.init(
    {
      room_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      room_number: { type: DataTypes.STRING(32), allowNull: false },
      name: { type: DataTypes.STRING(128), allowNull: false },
      department_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "CONSULTATION" },
      room_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "CONSULTATION" },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "AVAILABLE" },
      capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      current_occupancy: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "ClinicalRoom",
      tableName: "clinical_rooms",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalRoom;
};
