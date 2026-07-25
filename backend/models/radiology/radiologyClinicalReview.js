"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyClinicalReview extends Model {
    static associate(models) {
      RadiologyClinicalReview.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
      RadiologyClinicalReview.belongsTo(models.User, {
        foreignKey: "doctor_id",
        as: "doctor",
      });
    }
  }

  RadiologyClinicalReview.init(
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
      doctor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      review_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PENDING", // PENDING, REVIEWED, ACKNOWLEDGED
      },
      review_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      clinical_decision: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyClinicalReview",
      tableName: "radiology_clinical_reviews",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyClinicalReview;
};
