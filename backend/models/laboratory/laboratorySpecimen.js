"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratorySpecimen extends Model {
    static associate(models) {
      LaboratorySpecimen.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      LaboratorySpecimen.belongsTo(models.User, {
        foreignKey: "collected_by",
        as: "collector",
      });
      LaboratorySpecimen.belongsTo(models.LaboratorySpecimen, {
        foreignKey: "parent_specimen_id",
        as: "parentSpecimen",
      });
      LaboratorySpecimen.hasMany(models.LaboratorySpecimenStatusHistory, {
        foreignKey: "specimen_id",
        as: "statusHistory",
      });
      LaboratorySpecimen.hasMany(models.LaboratorySpecimenCollection, {
        foreignKey: "specimen_id",
        as: "collections",
      });
    }
  }

  LaboratorySpecimen.init(
    {
      specimen_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_specimen_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      specimen_type: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "BLOOD",
      },
      collection_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PENDING_COLLECTION",
      },
      collected_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      collected_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "LaboratorySpecimen",
      tableName: "laboratory_specimens",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratorySpecimen;
};
