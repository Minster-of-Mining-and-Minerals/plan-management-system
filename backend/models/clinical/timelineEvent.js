"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TimelineEvent extends Model {
    static associate(models) {
      TimelineEvent.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      TimelineEvent.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      TimelineEvent.belongsTo(models.User, {
        foreignKey: "actor_id",
        as: "actor",
      });
    }
  }

  TimelineEvent.init(
    {
      event_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      event_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      event_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      actor_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      resource_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      resource_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      sequelize,
      modelName: "TimelineEvent",
      tableName: "timeline_events",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return TimelineEvent;
};
