"use strict";

const { v4: uuidv4 } = require("uuid");

/** Ensure existing INTERNAL users have an internal_user_profiles row. */
module.exports = {
  async up(queryInterface) {
    const [users] = await queryInterface.sequelize.query(
      `SELECT u.user_id FROM users u
       LEFT JOIN internal_user_profiles p ON p.user_id = u.user_id
       WHERE u.account_type = 'INTERNAL' AND p.profile_id IS NULL`
    );

    const now = new Date();
    for (const row of users) {
      await queryInterface.bulkInsert("internal_user_profiles", [
        {
          profile_id: uuidv4(),
          user_id: row.user_id,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM internal_user_profiles WHERE department IS NULL AND job_title IS NULL AND employee_id IS NULL`
    );
  },
};
