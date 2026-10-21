"use strict";

/**
 * Migration: 20261021000001-remove-redundant-indexes.js
 *
 * Drops 25 verified redundant indexes that duplicate existing standard/constraint indexes.
 * Preserves all primary keys, foreign key supporting indexes, and required unique constraints.
 */

module.exports = {
  async up(queryInterface) {
    // Table: external_assignments (duplicate of uq_external_assignments_active_node_govt)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."external_assignments_active_node_govt_unique";`);

    // Table: external_assignments (duplicate of idx_external_assignments_govt_structure_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."external_assignments_govt_structure_id_idx";`);

    // Table: external_assignments (duplicate of idx_external_assignments_plan_node_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."external_assignments_plan_node_id_idx";`);

    // Table: internal_assignments (duplicate of idx_internal_assignments_internal_structure_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."internal_assignments_internal_structure_id_idx";`);

    // Table: internal_assignments (duplicate of idx_internal_assignments_plan_node_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."internal_assignments_plan_node_id_idx";`);

    // Table: internal_assignments (duplicate of idx_internal_assignments_user_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."internal_assignments_user_id_idx";`);

    // Table: internal_assignments (duplicate of uq_internal_assignments_active_node_dept)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."internal_assignments_active_node_dept_unique";`);

    // Table: internal_assignments (duplicate of uq_internal_assignments_active_node_user)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."internal_assignments_active_node_user_unique";`);

    // Table: notifications (duplicate of idx_notifications_recipient_category)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."notifications_recipient_category_idx";`);

    // Table: notifications (duplicate of idx_notifications_recipient_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."notifications_recipient_id_idx";`);

    // Table: notifications (duplicate of idx_notifications_recipient_read)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."notifications_recipient_read_idx";`);

    // Table: performance_color_thresholds (duplicate of idx_performance_color_thresholds_is_active)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."performance_color_thresholds_is_active";`);

    // Table: performance_color_thresholds (duplicate of idx_performance_color_thresholds_sort_order)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."performance_color_thresholds_sort_order";`);

    // Table: plan_node_action_logs (duplicate of idx_plan_node_action_logs_action_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_node_action_logs_action_id_idx";`);

    // Table: plan_node_action_logs (duplicate of idx_plan_node_action_logs_plan_node_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_node_action_logs_plan_node_id_idx";`);

    // Table: plan_node_action_logs (duplicate of idx_plan_node_action_logs_user_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_node_action_logs_user_id_idx";`);

    // Table: plan_nodes (duplicate of idx_plan_nodes_parent_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_nodes_parent_id_idx";`);

    // Table: plan_nodes (duplicate of idx_plan_nodes_plan_version_id)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_nodes_plan_version_id_idx";`);

    // Table: plan_nodes (duplicate of uq_plan_nodes_parent_title_version)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_nodes_parent_title_version_unique";`);

    // Table: plan_rule_steps (duplicate of uq_plan_rule_steps_rule_order)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_rule_steps_rule_order_unique";`);

    // Table: plan_versions (duplicate of uq_plan_versions_parent_sequence)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."plan_versions_parent_sequence_unique";`);

    // Table: system_audit_logs (duplicate of idx_system_audit_logs_action)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."system_audit_logs_action_idx";`);

    // Table: system_audit_logs (duplicate of idx_system_audit_logs_changed_by)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."system_audit_logs_changed_by_idx";`);

    // Table: system_audit_logs (duplicate of idx_system_audit_logs_created_at)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."system_audit_logs_created_at_idx";`);

    // Table: system_audit_logs (duplicate of idx_system_audit_logs_module)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS public."system_audit_logs_module_idx";`);
  },

  async down(queryInterface) {
    // Table: external_assignments (recreate external_assignments_active_node_govt_unique)
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS external_assignments_active_node_govt_unique ON public.external_assignments USING btree (plan_node_id, government_structure_id) WHERE (is_active = true);`);

    // Table: external_assignments (recreate external_assignments_govt_structure_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS external_assignments_govt_structure_id_idx ON public.external_assignments USING btree (government_structure_id);`);

    // Table: external_assignments (recreate external_assignments_plan_node_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS external_assignments_plan_node_id_idx ON public.external_assignments USING btree (plan_node_id);`);

    // Table: internal_assignments (recreate internal_assignments_internal_structure_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS internal_assignments_internal_structure_id_idx ON public.internal_assignments USING btree (internal_structure_id);`);

    // Table: internal_assignments (recreate internal_assignments_plan_node_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS internal_assignments_plan_node_id_idx ON public.internal_assignments USING btree (plan_node_id);`);

    // Table: internal_assignments (recreate internal_assignments_user_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS internal_assignments_user_id_idx ON public.internal_assignments USING btree (user_id);`);

    // Table: internal_assignments (recreate internal_assignments_active_node_dept_unique)
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS internal_assignments_active_node_dept_unique ON public.internal_assignments USING btree (plan_node_id, internal_structure_id) WHERE ((is_active = true) AND (internal_structure_id IS NOT NULL));`);

    // Table: internal_assignments (recreate internal_assignments_active_node_user_unique)
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS internal_assignments_active_node_user_unique ON public.internal_assignments USING btree (plan_node_id, user_id) WHERE ((is_active = true) AND (user_id IS NOT NULL));`);

    // Table: notifications (recreate notifications_recipient_category_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS notifications_recipient_category_idx ON public.notifications USING btree (recipient_id, category);`);

    // Table: notifications (recreate notifications_recipient_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON public.notifications USING btree (recipient_id);`);

    // Table: notifications (recreate notifications_recipient_read_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx ON public.notifications USING btree (recipient_id, is_read);`);

    // Table: performance_color_thresholds (recreate performance_color_thresholds_is_active)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS performance_color_thresholds_is_active ON public.performance_color_thresholds USING btree (is_active);`);

    // Table: performance_color_thresholds (recreate performance_color_thresholds_sort_order)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS performance_color_thresholds_sort_order ON public.performance_color_thresholds USING btree (sort_order);`);

    // Table: plan_node_action_logs (recreate plan_node_action_logs_action_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS plan_node_action_logs_action_id_idx ON public.plan_node_action_logs USING btree (action_id);`);

    // Table: plan_node_action_logs (recreate plan_node_action_logs_plan_node_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS plan_node_action_logs_plan_node_id_idx ON public.plan_node_action_logs USING btree (plan_node_id);`);

    // Table: plan_node_action_logs (recreate plan_node_action_logs_user_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS plan_node_action_logs_user_id_idx ON public.plan_node_action_logs USING btree (user_id);`);

    // Table: plan_nodes (recreate plan_nodes_parent_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS plan_nodes_parent_id_idx ON public.plan_nodes USING btree (parent_id);`);

    // Table: plan_nodes (recreate plan_nodes_plan_version_id_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS plan_nodes_plan_version_id_idx ON public.plan_nodes USING btree (plan_version_id);`);

    // Table: plan_nodes (recreate plan_nodes_parent_title_version_unique)
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS plan_nodes_parent_title_version_unique ON public.plan_nodes USING btree (parent_id, title, plan_version_id);`);

    // Table: plan_rule_steps (recreate plan_rule_steps_rule_order_unique)
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS plan_rule_steps_rule_order_unique ON public.plan_rule_steps USING btree (plan_rule_id, step_order);`);

    // Table: plan_versions (recreate plan_versions_parent_sequence_unique)
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS plan_versions_parent_sequence_unique ON public.plan_versions USING btree (parent_plan_version_id, sequence_index) WHERE (parent_plan_version_id IS NOT NULL);`);

    // Table: system_audit_logs (recreate system_audit_logs_action_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS system_audit_logs_action_idx ON public.system_audit_logs USING btree (action);`);

    // Table: system_audit_logs (recreate system_audit_logs_changed_by_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS system_audit_logs_changed_by_idx ON public.system_audit_logs USING btree (changed_by);`);

    // Table: system_audit_logs (recreate system_audit_logs_created_at_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS system_audit_logs_created_at_idx ON public.system_audit_logs USING btree (created_at);`);

    // Table: system_audit_logs (recreate system_audit_logs_module_idx)
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS system_audit_logs_module_idx ON public.system_audit_logs USING btree (module);`);
  },
};
