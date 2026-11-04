"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Reconcile existing duplicates in regional_plan_versions before creating unique index
    const [masters] = await queryInterface.sequelize.query(
      `SELECT regional_plan_version_id, planning_duration_years, draft_name
       FROM regional_plan_versions
       WHERE version_kind = 'master' AND deleted_at IS NULL;`
    );

    for (const master of masters) {
      const maxDuration = master.planning_duration_years || 3;
      const [annuals] = await queryInterface.sequelize.query(
        `SELECT regional_plan_version_id, sequence_index, annual_targets_finalized_at, created_at
         FROM regional_plan_versions
         WHERE parent_plan_version_id = :masterId AND version_kind = 'annual' AND deleted_at IS NULL
         ORDER BY sequence_index ASC, created_at ASC;`,
        { replacements: { masterId: master.regional_plan_version_id } }
      );

      const bySeq = {};
      for (const a of annuals) {
        if (!bySeq[a.sequence_index]) bySeq[a.sequence_index] = [];
        bySeq[a.sequence_index].push(a);
      }

      const toDelete = [];

      for (const [seqStr, list] of Object.entries(bySeq)) {
        const seq = Number(seqStr);
        if (seq > maxDuration) {
          toDelete.push(...list);
          continue;
        }
        if (list.length > 1) {
          list.sort((a, b) => {
            if (a.annual_targets_finalized_at && !b.annual_targets_finalized_at) return -1;
            if (!a.annual_targets_finalized_at && b.annual_targets_finalized_at) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
          });
          toDelete.push(...list.slice(1));
        }
      }

      for (const d of toDelete) {
        // Safe check for actuals
        const [actuals] = await queryInterface.sequelize.query(
          `SELECT COUNT(*)::int as count FROM regional_plan_nodes
           WHERE regional_plan_version_id = :versionId
             AND (period_actual IS NOT NULL OR annual_actual IS NOT NULL);`,
          { replacements: { versionId: d.regional_plan_version_id } }
        );

        if (actuals[0]?.count === 0) {
          // Find derived period versions to delete first
          const [childPeriods] = await queryInterface.sequelize.query(
            `SELECT regional_plan_version_id FROM regional_plan_versions
             WHERE parent_plan_version_id = :annId AND version_kind = 'execution_period';`,
            { replacements: { annId: d.regional_plan_version_id } }
          );

          for (const cp of childPeriods) {
            await queryInterface.sequelize.query(
              `DELETE FROM regional_plan_nodes WHERE regional_plan_version_id = :pId;`,
              { replacements: { pId: cp.regional_plan_version_id } }
            );
            await queryInterface.sequelize.query(
              `DELETE FROM regional_plan_versions WHERE regional_plan_version_id = :pId;`,
              { replacements: { pId: cp.regional_plan_version_id } }
            );
          }

          // Delete assignments and nodes of the duplicate annual version
          await queryInterface.sequelize.query(
            `DELETE FROM regional_internal_assignments WHERE regional_plan_node_id IN (
               SELECT regional_plan_node_id FROM regional_plan_nodes WHERE regional_plan_version_id = :annId
             );`,
            { replacements: { annId: d.regional_plan_version_id } }
          );

          await queryInterface.sequelize.query(
            `DELETE FROM regional_plan_nodes WHERE regional_plan_version_id = :annId;`,
            { replacements: { annId: d.regional_plan_version_id } }
          );

          await queryInterface.sequelize.query(
            `DELETE FROM regional_plan_versions WHERE regional_plan_version_id = :annId;`,
            { replacements: { annId: d.regional_plan_version_id } }
          );
        }
      }
    }

    // 2. Also reconcile any duplicate execution periods under remaining annual versions
    const [allRemainingAnnuals] = await queryInterface.sequelize.query(
      `SELECT regional_plan_version_id FROM regional_plan_versions
       WHERE version_kind = 'annual' AND deleted_at IS NULL;`
    );

    for (const ann of allRemainingAnnuals) {
      const [periods] = await queryInterface.sequelize.query(
        `SELECT regional_plan_version_id, sequence_index, period_targets_finalized_at, created_at
         FROM regional_plan_versions
         WHERE parent_plan_version_id = :annId AND version_kind = 'execution_period' AND deleted_at IS NULL
         ORDER BY sequence_index ASC, created_at ASC;`,
        { replacements: { annId: ann.regional_plan_version_id } }
      );

      const byPeriodSeq = {};
      for (const p of periods) {
        if (!byPeriodSeq[p.sequence_index]) byPeriodSeq[p.sequence_index] = [];
        byPeriodSeq[p.sequence_index].push(p);
      }

      for (const [seqStr, list] of Object.entries(byPeriodSeq)) {
        if (list.length > 1) {
          list.sort((a, b) => {
            if (a.period_targets_finalized_at && !b.period_targets_finalized_at) return -1;
            if (!a.period_targets_finalized_at && b.period_targets_finalized_at) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
          });
          const toDel = list.slice(1);
          for (const d of toDel) {
            await queryInterface.sequelize.query(
              `DELETE FROM regional_plan_nodes WHERE regional_plan_version_id = :pId;`,
              { replacements: { pId: d.regional_plan_version_id } }
            );
            await queryInterface.sequelize.query(
              `DELETE FROM regional_plan_versions WHERE regional_plan_version_id = :pId;`,
              { replacements: { pId: d.regional_plan_version_id } }
            );
          }
        }
      }
    }

    // 3. Create Unique Index on regional_plan_versions to prevent duplicate annual or period versions
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS regional_plan_versions_parent_seq_kind_uidx
       ON regional_plan_versions (parent_plan_version_id, sequence_index, version_kind)
       WHERE parent_plan_version_id IS NOT NULL AND deleted_at IS NULL;`
    );

    // 4. Create Unique Index on regional_plan_nodes to prevent duplicate derived nodes in any version
    // First deduplicate any accidental duplicate derived nodes
    await queryInterface.sequelize.query(
      `DELETE FROM regional_plan_nodes a USING regional_plan_nodes b
       WHERE a.regional_plan_node_id > b.regional_plan_node_id
         AND a.regional_plan_version_id = b.regional_plan_version_id
         AND a.source_regional_plan_node_id = b.source_regional_plan_node_id
         AND a.source_regional_plan_node_id IS NOT NULL
         AND a.is_active = true
         AND b.is_active = true
         AND a.period_actual IS NULL
         AND a.annual_actual IS NULL;`
    );

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS regional_plan_nodes_version_source_uidx
       ON regional_plan_nodes (regional_plan_version_id, source_regional_plan_node_id)
       WHERE source_regional_plan_node_id IS NOT NULL AND is_active = true AND deleted_at IS NULL;`
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS regional_plan_versions_parent_seq_kind_uidx;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS regional_plan_nodes_version_source_uidx;`
    );
  },
};
