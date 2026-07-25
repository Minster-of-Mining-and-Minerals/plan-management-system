"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyImage extends Model {
    static associate(models) {
      RadiologyImage.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
      RadiologyImage.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      RadiologyImage.belongsTo(models.User, {
        foreignKey: "uploaded_by",
        as: "uploader",
      });
    }
  }

  RadiologyImage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      study_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      study_instance_uid: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      series_instance_uid: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      sop_instance_uid: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      modality: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "XRAY",
      },
      image_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      storage_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "LOCAL",
      },
      storage_location: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      viewer_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      viewer_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "OHIF",
      },
      viewer_configuration: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      external_viewer_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyImage",
      tableName: "radiology_images",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyImage;
};
