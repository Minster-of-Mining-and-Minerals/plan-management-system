"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class LaboratoryWorkQueueItem extends Model {
    static associate(models) {
      LaboratoryWorkQueueItem.belongsTo(models.ClinicalOrder, {
        foreignKey: "order_id",
        as: "order",
      });
      LaboratoryWorkQueueItem.belongsTo(models.LaboratorySpecimen, {
        foreignKey: "specimen_id",
        as: "specimen",
      });
      LaboratoryWorkQueueItem.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "assignedStaff",
      });
      LaboratoryWorkQueueItem.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
    }
  }

  LaboratoryWorkQueueItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      specimen_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      queue_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
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
      modelName: "LaboratoryWorkQueueItem",
      tableName: "laboratory_work_queue_items",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LaboratoryWorkQueueItem;
};
