"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratorySpecimenCollection extends Model {
    static associate(models) {
      LaboratorySpecimenCollection.belongsTo(models.LaboratorySpecimen, {
        foreignKey: "specimen_id",
        as: "specimen",
      });
      LaboratorySpecimenCollection.belongsTo(models.User, {
        foreignKey: "collected_by",
        as: "collector",
      });
    }
  }

  LaboratorySpecimenCollection.init(
    {
      collection_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      specimen_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      collected_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      collection_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      collection_site: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      collector_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "LaboratorySpecimenCollection",
      tableName: "laboratory_specimen_collections",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratorySpecimenCollection;
};
