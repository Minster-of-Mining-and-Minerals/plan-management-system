"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Backfill production_item_units for items missing their default or base units
    await queryInterface.sequelize.query(`
      INSERT INTO production_item_units (item_unit_id, production_item_id, unit_id, conversion_factor_to_base, is_default, is_active, created_at, updated_at)
      SELECT 
          gen_random_uuid(),
          pi.production_item_id,
          COALESCE(pi.default_reporting_unit_id, pi.base_unit_id),
          1.0,
          true,
          true,
          NOW(),
          NOW()
      FROM production_items pi
      WHERE COALESCE(pi.default_reporting_unit_id, pi.base_unit_id) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM production_item_units piu 
          WHERE piu.production_item_id = pi.production_item_id 
            AND piu.unit_id = COALESCE(pi.default_reporting_unit_id, pi.base_unit_id)
      );

      INSERT INTO production_item_units (item_unit_id, production_item_id, unit_id, conversion_factor_to_base, is_default, is_active, created_at, updated_at)
      SELECT 
          gen_random_uuid(),
          pi.production_item_id,
          pi.base_unit_id,
          1.0,
          false,
          true,
          NOW(),
          NOW()
      FROM production_items pi
      WHERE pi.base_unit_id IS NOT NULL 
        AND pi.base_unit_id != COALESCE(pi.default_reporting_unit_id, pi.base_unit_id)
        AND NOT EXISTS (
          SELECT 1 FROM production_item_units piu 
          WHERE piu.production_item_id = pi.production_item_id 
            AND piu.unit_id = pi.base_unit_id
      );
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Non-destructive rollback
  },
};
