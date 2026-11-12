"use strict";

const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ==============================================================================
      // 1. UPDATE ADMINISTRATION ACCOUNT EMAIL TO plansystemadmin@gmail.com
      // ==============================================================================
      const adminOldEmail = "admin@gmail.com";
      const adminNewEmail = "plansystemadmin@gmail.com";
      const defaultPassword = "#Admin@2026MoM";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // Check if plansystemadmin@gmail.com already exists
      const [existingNewAdmin] = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE LOWER(email) = LOWER(:adminNewEmail) LIMIT 1`,
        { replacements: { adminNewEmail }, transaction }
      );

      if (existingNewAdmin && existingNewAdmin.length > 0) {
        // Just update password and status
        await queryInterface.sequelize.query(
          `UPDATE users SET password = :hashedPassword, is_active = true, is_first_logged_in = false, password_changed_at = NOW() WHERE LOWER(email) = LOWER(:adminNewEmail)`,
          { replacements: { adminNewEmail, hashedPassword }, transaction }
        );
        // Remove any old admin@gmail.com records
        await queryInterface.sequelize.query(
          `DELETE FROM users WHERE LOWER(email) = LOWER(:adminOldEmail)`,
          { replacements: { adminOldEmail }, transaction }
        );
      } else {
        // Check if admin@gmail.com exists to update
        const [existingOldAdmin] = await queryInterface.sequelize.query(
          `SELECT user_id FROM users WHERE LOWER(email) = LOWER(:adminOldEmail) LIMIT 1`,
          { replacements: { adminOldEmail }, transaction }
        );

        if (existingOldAdmin && existingOldAdmin.length > 0) {
          await queryInterface.sequelize.query(
            `UPDATE users 
             SET email = :adminNewEmail, 
                 password = :hashedPassword, 
                 is_active = true, 
                 is_first_logged_in = false, 
                 password_changed_at = NOW() 
             WHERE user_id = :userId`,
            {
              replacements: {
                adminNewEmail,
                hashedPassword,
                userId: existingOldAdmin[0].user_id,
              },
              transaction,
            }
          );
        } else {
          // If neither exists, update user_id 00000000-0000-4000-8000-000000000001
          await queryInterface.sequelize.query(
            `UPDATE users 
             SET email = :adminNewEmail, 
                 password = :hashedPassword, 
                 is_active = true, 
                 is_first_logged_in = false, 
                 password_changed_at = NOW() 
             WHERE user_id = '00000000-0000-4000-8000-000000000001'`,
            { replacements: { adminNewEmail, hashedPassword }, transaction }
          );
        }
      }

      console.log(`[MIGRATION] Administration account email set to ${adminNewEmail} and ${adminOldEmail} removed.`);

      // ==============================================================================
      // 2. PURGE DUPLICATE REGIONS: sidama mine adminstration, አማራ ማዕድን ቢሮ, SOUTH WEST
      // ==============================================================================
      const [targetRegions] = await queryInterface.sequelize.query(
        `SELECT region_id, name, code FROM regions
         WHERE (name ILIKE '%sidama mine%' AND code != 'ET-SI')
            OR (name ILIKE '%sidema mine%' AND code != 'ET-SI')
            OR (name = 'አማራ ማዕድን ቢሮ' AND code != 'ET-AM')
            OR (code = 'AMH')
            OR (code = 'SM')
            OR (code IN ('SWR', '12'))
            OR (name = 'SOUTH WEST' AND code != 'ET-SW')
            OR (name = 'saouth west region' AND code != 'ET-SW')`,
        { transaction }
      );

      if (targetRegions && targetRegions.length > 0) {
        const regionIds = targetRegions.map((r) => r.region_id);
        console.log(`[MIGRATION] Found ${targetRegions.length} duplicate region(s) to remove:`);
        targetRegions.forEach((r) => console.log(` - [${r.code}] ${r.name} (${r.region_id})`));

        // Find all users belonging to these duplicate regions
        const [targetUsers] = await queryInterface.sequelize.query(
          `SELECT user_id, email, full_name FROM users WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );

        if (targetUsers && targetUsers.length > 0) {
          const userIds = targetUsers.map((u) => u.user_id);
          console.log(`[MIGRATION] Found ${targetUsers.length} user(s) belonging to duplicate regions to delete:`);
          targetUsers.forEach((u) => console.log(` - ${u.email} (${u.full_name})`));

          // Unlink / clean all foreign key dependencies for these users
          await queryInterface.sequelize.query(
            `DELETE FROM user_roles WHERE user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM user_permission_groups WHERE user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM user_sessions WHERE user_id IN (:userIds) OR terminated_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM user_device_restrictions WHERE user_id IN (:userIds) OR restricted_by IN (:userIds) OR unrestricted_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM ip_restrictions WHERE restricted_by IN (:userIds) OR unrestricted_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM session_security_logs WHERE user_id IN (:userIds) OR actor_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM notifications WHERE recipient_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE regional_requirement_mappings 
             SET confirmed_by = NULL, created_by = NULL, updated_by = NULL 
             WHERE confirmed_by IN (:userIds) OR created_by IN (:userIds) OR updated_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE national_reporting_assignments SET assigned_by = NULL WHERE assigned_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE national_published_records SET published_by = NULL WHERE published_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM regional_issue_comments WHERE user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM regional_issue_histories WHERE performed_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM regional_issue_escalation_messages WHERE sender_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE regional_issues 
             SET raised_by = NULL, assigned_to = NULL 
             WHERE raised_by IN (:userIds) OR assigned_to IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE regional_issue_escalations 
             SET escalated_by = NULL, federal_assigned_to = NULL, recalled_by = NULL 
             WHERE escalated_by IN (:userIds) OR federal_assigned_to IN (:userIds) OR recalled_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM regional_plan_node_action_logs WHERE user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM regional_internal_assignments WHERE assigned_user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE regional_plan_nodes 
             SET period_actual_submitted_by = NULL, period_actual_approved_by = NULL, period_actual_validated_by = NULL,
                 annual_actual_submitted_by = NULL, annual_actual_approved_by = NULL, annual_actual_validated_by = NULL
             WHERE period_actual_submitted_by IN (:userIds) OR period_actual_approved_by IN (:userIds) OR period_actual_validated_by IN (:userIds)
                OR annual_actual_submitted_by IN (:userIds) OR annual_actual_approved_by IN (:userIds) OR annual_actual_validated_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE internal_assignments SET user_id = NULL WHERE user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM note_attachments WHERE note_id IN (SELECT note_id FROM notes WHERE created_by IN (:userIds))`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM notes WHERE created_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM system_audit_logs WHERE changed_by IN (:userIds) OR (table_name = 'users' AND record_id IN (:userIds))`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM branding_audit_logs WHERE changed_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM target_allocation_histories WHERE changed_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM target_reallocation_requests WHERE requested_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE target_reallocation_requests SET reviewed_by = NULL WHERE reviewed_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM plan_amendment_histories WHERE changed_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `DELETE FROM plan_amendments WHERE requested_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          await queryInterface.sequelize.query(
            `UPDATE plan_amendments SET reviewed_by = NULL WHERE reviewed_by IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );

          // Finally, delete the users completely
          await queryInterface.sequelize.query(
            `DELETE FROM users WHERE user_id IN (:userIds)`,
            { replacements: { userIds }, transaction }
          );
          console.log(`[MIGRATION] Deleted ${targetUsers.length} user(s) from duplicate regions.`);
        }

        // Clean dependent data for these regions
        await queryInterface.sequelize.query(
          `DELETE FROM national_published_records WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_requirement_mappings WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM national_reporting_assignments WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );

        await queryInterface.sequelize.query(
          `DELETE FROM regional_issue_escalation_messages 
           WHERE escalation_id IN (
             SELECT escalation_id FROM regional_issue_escalations 
             WHERE region_id IN (:regionIds) 
                OR regional_issue_id IN (SELECT regional_issue_id FROM regional_issues WHERE region_id IN (:regionIds))
           )`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_issue_escalations 
           WHERE region_id IN (:regionIds) 
              OR regional_issue_id IN (SELECT regional_issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_issue_comments 
           WHERE regional_issue_id IN (SELECT regional_issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_issue_attachments 
           WHERE regional_issue_id IN (SELECT regional_issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_issue_histories 
           WHERE regional_issue_id IN (SELECT regional_issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_issues WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );

        await queryInterface.sequelize.query(
          `DELETE FROM regional_plan_node_action_logs 
           WHERE regional_plan_node_id IN (
             SELECT regional_plan_node_id FROM regional_plan_nodes 
             WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM regional_plan_versions WHERE region_id IN (:regionIds))
           )`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_internal_assignments 
           WHERE regional_plan_node_id IN (
             SELECT regional_plan_node_id FROM regional_plan_nodes 
             WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM regional_plan_versions WHERE region_id IN (:regionIds))
           )`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_plan_nodes 
           WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM regional_plan_versions WHERE region_id IN (:regionIds))`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_plan_rule_steps 
           WHERE regional_plan_rule_id IN (SELECT regional_plan_rule_id FROM regional_plan_rules WHERE region_id IN (:regionIds))`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_plan_rules WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_planning_configurations WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_plan_versions WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_performance_color_thresholds WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_branding_settings WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `UPDATE regional_structures SET parent_id = NULL WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM regional_structures WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM user_sessions WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `UPDATE roles SET region_id = NULL WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );
        await queryInterface.sequelize.query(
          `UPDATE permission_groups SET region_id = NULL WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );

        // Finally, delete the regions themselves
        await queryInterface.sequelize.query(
          `DELETE FROM regions WHERE region_id IN (:regionIds)`,
          { replacements: { regionIds }, transaction }
        );

        console.log(`[MIGRATION] Purged ${targetRegions.length} duplicate regions successfully.`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Irreversible cleanup of duplicate test entities
  },
};
