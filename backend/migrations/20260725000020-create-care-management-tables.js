"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_care_plans
    await queryInterface.createTable("clinical_care_plans", {
      plan_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      problem_id: { type: Sequelize.UUID, allowNull: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "DRAFT" },
      priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "MEDIUM" },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      target_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 2. clinical_goals
    await queryInterface.createTable("clinical_goals", {
      goal_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      plan_id: { type: Sequelize.UUID, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "PENDING" },
      target_value: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      baseline_value: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      current_value: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      unit: { type: Sequelize.STRING(50), allowNull: true },
      target_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 3. clinical_interventions
    await queryInterface.createTable("clinical_interventions", {
      intervention_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      goal_id: { type: Sequelize.UUID, allowNull: true },
      plan_id: { type: Sequelize.UUID, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      intervention_type: { type: Sequelize.STRING(50), allowNull: false, defaultValue: "OTHER" },
      description: { type: Sequelize.TEXT, allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "PLANNED" },
      scheduled_date: { type: Sequelize.DATEONLY, allowNull: true },
      completed_date: { type: Sequelize.DATE, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 4. care_team_members
    await queryInterface.createTable("care_team_members", {
      team_member_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      plan_id: { type: Sequelize.UUID, allowNull: false },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      clinician_id: { type: Sequelize.UUID, allowNull: false },
      role: { type: Sequelize.STRING(50), allowNull: false, defaultValue: "OTHER" },
      responsibilities: { type: Sequelize.TEXT, allowNull: true },
      added_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 5. clinical_tasks
    await queryInterface.createTable("clinical_tasks", {
      task_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      plan_id: { type: Sequelize.UUID, allowNull: true },
      alert_id: { type: Sequelize.UUID, allowNull: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      assigned_to: { type: Sequelize.UUID, allowNull: false },
      assigned_by: { type: Sequelize.UUID, allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "OPEN" },
      priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "MEDIUM" },
      due_date: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    // 6. patient_outcomes
    await queryInterface.createTable("patient_outcomes", {
      outcome_id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      plan_id: { type: Sequelize.UUID, allowNull: false },
      goal_id: { type: Sequelize.UUID, allowNull: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      outcome_name: { type: Sequelize.STRING(200), allowNull: false },
      baseline_value: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      target_value: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      current_value: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      unit: { type: Sequelize.STRING(50), allowNull: true },
      progress_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "STABLE" },
      measured_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      recorded_by: { type: Sequelize.UUID, allowNull: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("patient_outcomes");
    await queryInterface.dropTable("clinical_tasks");
    await queryInterface.dropTable("care_team_members");
    await queryInterface.dropTable("clinical_interventions");
    await queryInterface.dropTable("clinical_goals");
    await queryInterface.dropTable("clinical_care_plans");
  },
};
