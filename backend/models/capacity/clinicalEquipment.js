"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ClinicalEquipment extends Model {
    static associate(models) {
      ClinicalEquipment.hasMany(models.ClinicalResourceAssignment, {
        foreignKey: "resource_id",
        constraints: false,
        as: "assignments",
      });
    }
  }

  ClinicalEquipment.init(
    {
      equipment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      equipment_code: { type: DataTypes.STRING(64), allowNull: false },
      name: { type: DataTypes.STRING(128), allowNull: false },
      department_id: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "RADIOLOGY" },
      equipment_type: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "DIAGNOSTIC" },
      status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "AVAILABLE" },
      maintenance_due: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ClinicalEquipment",
      tableName: "clinical_equipment",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ClinicalEquipment;
};
