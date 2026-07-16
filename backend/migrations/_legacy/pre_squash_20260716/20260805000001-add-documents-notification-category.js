"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE enum_notification_templates_category ADD VALUE IF NOT EXISTS 'documents';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE enum_notifications_category ADD VALUE IF NOT EXISTS 'documents';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    const [existing] = await queryInterface.sequelize.query(
      `SELECT notification_template_id FROM notification_templates WHERE template_code = 'DOCUMENT_FORWARDED' LIMIT 1`
    );

    if (existing.length === 0) {
      const now = new Date();
      await queryInterface.bulkInsert("notification_templates", [
        {
          notification_template_id: "70000000-0000-4000-8000-000000000008",
          template_code: "DOCUMENT_FORWARDED",
          category: "documents",
          notification_type: "document_forwarded",
          title_template: "{{sender_name}} forwarded a document to you",
          message_template: '{{message}}',
          related_entity_type: "document",
          default_link_path: "/documents/{{document_id}}",
          icon_variant: "file",
          priority: "normal",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down() {
    // PostgreSQL enum values cannot be removed safely; leave enum value in place.
  },
};
