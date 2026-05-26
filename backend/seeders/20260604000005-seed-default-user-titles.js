"use strict";

const { v4: uuidv4 } = require("uuid");

const DEFAULT_TITLES = [
  { name: "Dr.", code: "DR" },
  { name: "Prof.", code: "PROF" },
  { name: "Mr.", code: "MR" },
  { name: "Mrs.", code: "MRS" },
  { name: "Ms.", code: "MS" },
  { name: "Nurse", code: "NURSE" },
  { name: "Pharmacist", code: "PHARM" },
  { name: "Receptionist", code: "REC" },
  { name: "Technician", code: "TECH" },
  { name: "Accountant", code: "ACCT" },
  { name: "Administrator", code: "ADMIN" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const row of DEFAULT_TITLES) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT title_id FROM user_titles
         WHERE name = :name OR code = :code LIMIT 1`,
        { replacements: row }
      );

      if (!existing.length) {
        await queryInterface.bulkInsert("user_titles", [
          {
            title_id: uuidv4(),
            name: row.name,
            code: row.code,
            status: "active",
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("user_titles", {
      code: {
        [Sequelize.Op.in]: DEFAULT_TITLES.map((t) => t.code),
      },
    });
  },
};
