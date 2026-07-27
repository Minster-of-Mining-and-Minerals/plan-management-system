"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ExecutionQueue extends Model {
    static associate(models) {
      ExecutionQueue.belongsTo(models.Department, {
        foreignKey: "department_id",
        as: "department",
      });
      ExecutionQueue.hasMany(models.WorkflowTask, {
        foreignKey: "execution_queue_id",
        as: "tasks",
      });
      ExecutionQueue.hasMany(models.ClinicalOrder, {
        foreignKey: "execution_queue_id",
        as: "orders",
      });
    }
  }

  ExecutionQueue.init(
    {
      queue_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      queue_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "DEPARTMENT",
      },
      queue_name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      queue_code: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      department_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_claimable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sla_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 60,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: "ExecutionQueue",
      tableName: "execution_queues",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return ExecutionQueue;
};
