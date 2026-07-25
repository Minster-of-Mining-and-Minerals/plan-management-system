"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyWorkQueueItem extends Model {
    static associate(models) {
      RadiologyWorkQueueItem.belongsTo(models.RadiologyStudy, {
        foreignKey: "study_id",
        as: "study",
      });
      RadiologyWorkQueueItem.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      RadiologyWorkQueueItem.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "assignedStaff",
      });
      RadiologyWorkQueueItem.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
    }
  }

  RadiologyWorkQueueItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      study_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      queue_type: {
        type: DataTypes.STRING(32),
        allowNull: false, // SCHEDULING, WAITING, IMAGING, REPORTING, VERIFICATION
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "WAITING",
      },
      priority: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "ROUTINE",
      },
      assigned_staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      entered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      claimed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RadiologyWorkQueueItem",
      tableName: "radiology_work_queue_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyWorkQueueItem;
};
