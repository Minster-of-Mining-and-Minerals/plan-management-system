"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const default3LevelSteps = [
      { level: 1, name: "SF", node_type: "strategic", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#8B5CF6" },
      { level: 2, name: "Goal", node_type: "goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#3B82F6" },
      { level: 3, name: "KPI", node_type: "kpi", requires_weight: true, requires_contribution_weight: true, allow_kpi: true, color_hex: "#10B981" },
    ];

    const default4LevelSteps = [
      { level: 1, name: "Strategic Priority", node_type: "strategic", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#8B5CF6" },
      { level: 2, name: "Goal", node_type: "goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#3B82F6" },
      { level: 3, name: "Key Performance Indicator (KPI)", node_type: "kpi", requires_weight: true, requires_contribution_weight: true, allow_kpi: true, color_hex: "#10B981" },
      { level: 4, name: "Operational Activity / Task", node_type: "task", requires_weight: false, requires_contribution_weight: true, allow_kpi: true, color_hex: "#F59E0B" },
    ];

    // 1. Repair Oromia's active 3-level rule and draft plan snapshots
    const threeLevelRuleIds = [
      "1834a562-0a34-418b-832e-f17df1d83ab0",
      "0700f97a-4d9f-4f5c-aa5f-1a112b48035c",
      "314676f5-0a1b-44b8-a2af-85f059e8d511",
      "138ef95b-f4cc-407f-8d02-3f48f29a5bc0",
    ];

    for (const ruleId of threeLevelRuleIds) {
      // These IDs come from a specific environment; skip on fresh databases
      // where the rule does not exist (avoids FK violations on steps insert).
      const [existingRule] = await queryInterface.sequelize.query(
        `SELECT 1 FROM public.regional_plan_rules WHERE regional_plan_rule_id = :ruleId LIMIT 1;`,
        { replacements: { ruleId } }
      );
      if (!existingRule || existingRule.length === 0) continue;

      await queryInterface.sequelize.query(`
        UPDATE public.regional_plan_rules
        SET name = 'Standard 3-Level Plan',
            source_regional_plan_rule_id = CASE
              WHEN regional_plan_rule_id = '1834a562-0a34-418b-832e-f17df1d83ab0' THEN NULL
              ELSE '1834a562-0a34-418b-832e-f17df1d83ab0'::uuid
            END,
            updated_at = NOW()
        WHERE regional_plan_rule_id = :ruleId;
      `, { replacements: { ruleId } });

      await queryInterface.sequelize.query(`
        DELETE FROM public.regional_plan_rule_steps WHERE regional_plan_rule_id = :ruleId;
      `, { replacements: { ruleId } });

      for (const step of default3LevelSteps) {
        await queryInterface.sequelize.query(`
          INSERT INTO public.regional_plan_rule_steps (
            regional_plan_rule_step_id, regional_plan_rule_id, level, name,
            node_type, requires_weight, requires_contribution_weight, allow_kpi, color_hex,
            created_at, updated_at
          ) VALUES (
            gen_random_uuid(), :ruleId, :level, :name,
            :node_type, :requires_weight, :requires_contribution_weight, :allow_kpi, :color_hex,
            NOW(), NOW()
          );
        `, {
          replacements: {
            ruleId,
            level: step.level,
            name: step.name,
            node_type: step.node_type,
            requires_weight: step.requires_weight,
            requires_contribution_weight: step.requires_contribution_weight,
            allow_kpi: step.allow_kpi,
            color_hex: step.color_hex,
          },
        });
      }
    }

    // 2. Ensure all other regional plan rules that have 0 steps are populated with 4-level defaults
    const [emptyRules] = await queryInterface.sequelize.query(`
      SELECT r.regional_plan_rule_id, r.name
      FROM public.regional_plan_rules r
      WHERE NOT EXISTS (
        SELECT 1 FROM public.regional_plan_rule_steps s
        WHERE s.regional_plan_rule_id = r.regional_plan_rule_id
      );
    `);

    for (const rule of emptyRules) {
      const is3Level = (rule.name || "").includes("3");
      const stepsToInsert = is3Level ? default3LevelSteps : default4LevelSteps;

      for (const step of stepsToInsert) {
        await queryInterface.sequelize.query(`
          INSERT INTO public.regional_plan_rule_steps (
            regional_plan_rule_step_id, regional_plan_rule_id, level, name,
            node_type, requires_weight, requires_contribution_weight, allow_kpi, color_hex,
            created_at, updated_at
          ) VALUES (
            gen_random_uuid(), :ruleId, :level, :name,
            :node_type, :requires_weight, :requires_contribution_weight, :allow_kpi, :color_hex,
            NOW(), NOW()
          );
        `, {
          replacements: {
            ruleId: rule.regional_plan_rule_id,
            level: step.level,
            name: step.name,
            node_type: step.node_type,
            requires_weight: step.requires_weight,
            requires_contribution_weight: step.requires_contribution_weight,
            allow_kpi: step.allow_kpi,
            color_hex: step.color_hex,
          },
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Migration is safe and repairs data corruption
  },
};
