"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WorkflowTask extends Model {
    static associate(models) {
      WorkflowTask.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      WorkflowTask.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      WorkflowTask.belongsTo(models.User, {
        foreignKey: "assignee_staff_id",
        as: "assignee",
      });
      WorkflowTask.belongsTo(models.User, {
        foreignKey: "assigned_by_staff_id",
        as: "assignedBy",
      });
      WorkflowTask.belongsTo(models.MedicalHistoryLog, {
        foreignKey: "medical_log_id",
        as: "medicalLog",
      });
      WorkflowTask.belongsTo(models.ExecutionQueue, {
        foreignKey: "execution_queue_id",
        as: "executionQueue",
      });
      WorkflowTask.belongsTo(models.User, {
        foreignKey: "claimed_by_staff_id",
        as: "claimedByStaff",
      });
    }
  }

  WorkflowTask.init(
    {
      task_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointment_id: { type: DataTypes.UUID, allowNull: false },
      patient_id: { type: DataTypes.UUID, allowNull: false },
      assignee_staff_id: { type: DataTypes.UUID, allowNull: false },
      assigned_by_staff_id: { type: DataTypes.UUID, allowNull: true },
      execution_queue_id: { type: DataTypes.UUID, allowNull: true },
      claimed_by_staff_id: { type: DataTypes.UUID, allowNull: true },
      medical_log_id: { type: DataTypes.UUID, allowNull: true },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      task_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "CONSULTATION",
      },
      assignment_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "OPERATIONAL",
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      claimed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sla_due_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "WorkflowTask",
      tableName: "workflow_tasks",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return WorkflowTask;
};
