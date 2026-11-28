"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const targetPlanId = "476e2690-d7c0-4bcf-84bc-9b9fb72ed8da";
    const momSectorId = "10000000-0000-4000-8000-000000000004"; // Ministry of Mines (Parent Sector)
    const otherPlanIds = [
      "893a01ea-f4e9-4cb7-9d8f-326ea17d98f4",
      "69a81bdb-38c4-4dcd-bf6b-505b5cd84853",
    ];

    // 1. Move all KPIs from other plans to the target plan
    await queryInterface.bulkUpdate(
      "short_term_kpis",
      {
        short_term_plan_id: targetPlanId,
      },
      {
        short_term_plan_id: otherPlanIds,
      }
    );

    // 2. Set the single unified plan's title and parent sector (Ministry of Mines)
    await queryInterface.bulkUpdate(
      "short_term_plans",
      {
        title: "የማዕድን ኢትዮጵያ ጂኦሎጂካል ሰርቨይ ኢንስቲትዩት የ100 ቀን ዕቅድ የድርጊት መርሃ ግብር",
        government_structure_id: momSectorId,
        duration_days: 100,
        status: "active",
      },
      {
        short_term_plan_id: targetPlanId,
      }
    );

    // 3. Delete the other 2 redundant empty plan records
    await queryInterface.bulkDelete("short_term_plans", {
      short_term_plan_id: otherPlanIds,
    });
  },

  async down(queryInterface, Sequelize) {
    // Reversal is not required for data consolidation
  },
};
