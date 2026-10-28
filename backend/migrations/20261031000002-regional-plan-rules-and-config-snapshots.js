"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Drop the single-config-per-region UNIQUE constraint to permit version-owned snapshots
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_planning_configurations
      DROP CONSTRAINT IF EXISTS uq_regional_planning_config_region;
    `);

    // 2. Add version snapshotting columns to regional_planning_configurations
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_planning_configurations
      ADD COLUMN IF NOT EXISTS owned_by_plan_version_id UUID REFERENCES public.regional_plan_versions(regional_plan_version_id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS source_regional_planning_config_id UUID REFERENCES public.regional_planning_configurations(regional_planning_config_id) ON DELETE SET NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_plan_config_region_template
      ON public.regional_planning_configurations(region_id)
      WHERE owned_by_plan_version_id IS NULL;

      CREATE INDEX IF NOT EXISTS idx_reg_plan_config_owned
      ON public.regional_planning_configurations(owned_by_plan_version_id);
    `);

    // 3. Add version snapshotting columns to regional_plan_rules
    await queryInterface.sequelize.query(`
      ALTER TABLE public.regional_plan_rules
      ADD COLUMN IF NOT EXISTS owned_by_plan_version_id UUID REFERENCES public.regional_plan_versions(regional_plan_version_id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS source_regional_plan_rule_id UUID REFERENCES public.regional_plan_rules(regional_plan_rule_id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_reg_plan_rules_owned
      ON public.regional_plan_rules(owned_by_plan_version_id);
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_reg_plan_rules_owned;
      ALTER TABLE public.regional_plan_rules
      DROP COLUMN IF EXISTS owned_by_plan_version_id,
      DROP COLUMN IF EXISTS source_regional_plan_rule_id;

      DROP INDEX IF EXISTS idx_reg_plan_config_owned;
      DROP INDEX IF EXISTS uq_reg_plan_config_region_template;
      ALTER TABLE public.regional_planning_configurations
      DROP COLUMN IF EXISTS owned_by_plan_version_id,
      DROP COLUMN IF EXISTS source_regional_planning_config_id;

      ALTER TABLE public.regional_planning_configurations
      ADD CONSTRAINT uq_regional_planning_config_region UNIQUE (region_id);
    `);
  },
};
