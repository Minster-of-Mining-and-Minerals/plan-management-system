"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add amendment_policy to regional_plan_rules
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_plan_rules
      ADD COLUMN IF NOT EXISTS amendment_policy JSONB NOT NULL DEFAULT '{
        "completed_periods_editable": false,
        "automatic_redistribution": "manual",
        "allow_emergency_approvals": false,
        "allow_structural_amendments_after_execution": true,
        "allow_ownership_transfer": true
      }'::jsonb;
    `);

    // 2. Add node_type to regional_plan_rule_steps
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_plan_rule_steps
      ADD COLUMN IF NOT EXISTS node_type VARCHAR(50) DEFAULT 'task';
    `);

    // 3. Backfill node_type based on level
    await queryInterface.sequelize.query(`
      UPDATE public.regional_plan_rule_steps
      SET node_type = CASE
        WHEN level = 1 THEN 'strategic'
        WHEN level = 2 THEN 'goal'
        WHEN level = 3 THEN 'kpi'
        ELSE 'task'
      END
      WHERE node_type IS NULL OR node_type = 'task';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_plan_rules
      DROP COLUMN IF EXISTS amendment_policy;

      ALTER TABLE public.regional_plan_rule_steps
      DROP COLUMN IF EXISTS node_type;
    `);
  },
};
