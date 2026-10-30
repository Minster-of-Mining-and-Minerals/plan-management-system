"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Clean up duplicate active template rules for regions (keep the most recent active one)
    await queryInterface.sequelize.query(`
      WITH ranked_reg_rules AS (
        SELECT regional_plan_rule_id,
               region_id,
               ROW_NUMBER() OVER (PARTITION BY region_id ORDER BY created_at DESC) as rn
        FROM public.regional_plan_rules
        WHERE owned_by_plan_version_id IS NULL AND is_active = true
      )
      UPDATE public.regional_plan_rules
      SET is_active = false
      WHERE regional_plan_rule_id IN (
        SELECT regional_plan_rule_id FROM ranked_reg_rules WHERE rn > 1
      );
    `);

    // 2. Add partial unique index for single active template rule per region
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_plan_rule_region_active_template
      ON public.regional_plan_rules(region_id)
      WHERE owned_by_plan_version_id IS NULL AND is_active = true;
    `);

    // 3. Clean up duplicate active rules for companies (keep the most recent active one)
    await queryInterface.sequelize.query(`
      WITH ranked_comp_rules AS (
        SELECT company_plan_rule_id,
               company_id,
               ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at DESC) as rn
        FROM public.company_plan_rules
        WHERE is_active = true
      )
      UPDATE public.company_plan_rules
      SET is_active = false
      WHERE company_plan_rule_id IN (
        SELECT company_plan_rule_id FROM ranked_comp_rules WHERE rn > 1
      );
    `);

    // 4. Add partial unique index for single active rule per company
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_comp_plan_rule_company_active
      ON public.company_plan_rules(company_id)
      WHERE is_active = true;
    `);

    // 5. Synchronize unfinalized regional master draft plans with 0 nodes to use the region's active rule
    const [draftPlans] = await queryInterface.sequelize.query(`
      SELECT p.regional_plan_version_id, p.region_id, p.regional_plan_rule_id
      FROM public.regional_plan_versions p
      WHERE p.version_kind = 'master' AND p.status = 'draft'
        AND NOT EXISTS (
          SELECT 1 FROM public.regional_plan_nodes n
          WHERE n.regional_plan_version_id = p.regional_plan_version_id
        );
    `);

    for (const draft of draftPlans) {
      const [activeRules] = await queryInterface.sequelize.query(`
        SELECT regional_plan_rule_id, name, performance_scoring_policy, amendment_policy
        FROM public.regional_plan_rules
        WHERE region_id = :regionId AND is_active = true AND owned_by_plan_version_id IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
      `, { replacements: { regionId: draft.region_id } });

      if (activeRules.length > 0) {
        const activeRule = activeRules[0];
        // Check if the draft's rule is already owned
        const [ownedRules] = await queryInterface.sequelize.query(`
          SELECT regional_plan_rule_id
          FROM public.regional_plan_rules
          WHERE owned_by_plan_version_id = :versionId
          LIMIT 1;
        `, { replacements: { versionId: draft.regional_plan_version_id } });

        let targetRuleId;
        if (ownedRules.length > 0) {
          targetRuleId = ownedRules[0].regional_plan_rule_id;
          await queryInterface.sequelize.query(`
            UPDATE public.regional_plan_rules
            SET name = :name,
                source_regional_plan_rule_id = :sourceId,
                performance_scoring_policy = :scoring,
                amendment_policy = :amendment
            WHERE regional_plan_rule_id = :ruleId;
          `, {
            replacements: {
              name: activeRule.name,
              sourceId: activeRule.regional_plan_rule_id,
              scoring: activeRule.performance_scoring_policy || "CAP_100",
              amendment: JSON.stringify(activeRule.amendment_policy || {}),
              ruleId: targetRuleId,
            }
          });
        } else {
          const [newRule] = await queryInterface.sequelize.query(`
            INSERT INTO public.regional_plan_rules (
              regional_plan_rule_id, region_id, name, is_active,
              owned_by_plan_version_id, source_regional_plan_rule_id,
              performance_scoring_policy, amendment_policy, created_at, updated_at
            ) VALUES (
              gen_random_uuid(), :regionId, :name, true,
              :versionId, :sourceId,
              :scoring, :amendment::jsonb, NOW(), NOW()
            ) RETURNING regional_plan_rule_id;
          `, {
            replacements: {
              regionId: draft.region_id,
              name: activeRule.name,
              versionId: draft.regional_plan_version_id,
              sourceId: activeRule.regional_plan_rule_id,
              scoring: activeRule.performance_scoring_policy || "CAP_100",
              amendment: JSON.stringify(activeRule.amendment_policy || {}),
            }
          });
          targetRuleId = newRule[0].regional_plan_rule_id;

          await queryInterface.sequelize.query(`
            UPDATE public.regional_plan_versions
            SET regional_plan_rule_id = :ruleId
            WHERE regional_plan_version_id = :versionId;
          `, { replacements: { ruleId: targetRuleId, versionId: draft.regional_plan_version_id } });
        }

        // Replace steps in targetRuleId with steps from activeRule
        await queryInterface.sequelize.query(`
          DELETE FROM public.regional_plan_rule_steps WHERE regional_plan_rule_id = :targetRuleId;
        `, { replacements: { targetRuleId } });

        const [sourceSteps] = await queryInterface.sequelize.query(`
          SELECT level, name, requires_weight, requires_contribution_weight, allow_kpi, node_type, color_hex
          FROM public.regional_plan_rule_steps
          WHERE regional_plan_rule_id = :sourceRuleId
          ORDER BY level ASC;
        `, { replacements: { sourceRuleId: activeRule.regional_plan_rule_id } });

        for (const s of sourceSteps) {
          await queryInterface.sequelize.query(`
            INSERT INTO public.regional_plan_rule_steps (
              regional_plan_rule_step_id, regional_plan_rule_id, level, name,
              requires_weight, requires_contribution_weight, allow_kpi, node_type, color_hex,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), :targetRuleId, :level, :name,
              :requiresWeight, :requiresContrib, :allowKpi, :nodeType, :colorHex,
              NOW(), NOW()
            );
          `, {
            replacements: {
              targetRuleId,
              level: s.level,
              name: s.name,
              requiresWeight: s.requires_weight,
              requiresContrib: s.requires_contribution_weight,
              allowKpi: s.allow_kpi,
              nodeType: s.node_type || "task",
              colorHex: s.color_hex || "#6B7280",
            }
          });
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uq_comp_plan_rule_company_active;
      DROP INDEX IF EXISTS uq_reg_plan_rule_region_active_template;
    `);
  },
};

