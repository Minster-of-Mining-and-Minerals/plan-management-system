"use strict";

const {
  BRANDING_IDS,
  PARENT_SECTOR_NAME,
  CHILD_SECTOR_BRANDING,
} = require("./data/minsterOfMinesBranding.data");

const BRANDING_COLUMNS = [
  "system_name_full",
  "system_name_short",
  "system_tagline",
  "logo_primary_path",
  "logo_secondary_path",
  "favicon_path",
  "primary_color",
  "secondary_color",
  "accent_color",
  "success_color",
  "warning_color",
  "error_color",
  "info_color",
  "background_color",
  "surface_color",
  "sidebar_color",
  "header_color",
  "text_primary_color",
  "text_secondary_color",
  "border_color",
  "sidebar_nav_hover_color",
  "sidebar_nav_active_color",
  "sidebar_nav_active_text_color",
  "sidebar_subnav_active_color",
  "sidebar_subnav_active_text_color",
  "sidebar_header_text_color",
  "toolbar_button_color",
  "toolbar_button_hover_color",
  "toolbar_button_text_color",
  "table_header_color",
  "table_header_hover_color",
  "table_header_text_color",
];

async function findSectorByName(queryInterface, name, parentId = null) {
  const parentClause =
    parentId === null ? "parent_id IS NULL" : "parent_id = :parentId";
  const replacements = parentId === null ? { name } : { name, parentId };

  const rows = await queryInterface.sequelize.query(
    `SELECT government_structure_id, name
     FROM government_structures
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name))
       AND ${parentClause}
     LIMIT 1`,
    {
      replacements,
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ?? null;
}

async function upsertSectorBranding(queryInterface, branding, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT branding_setting_id
     FROM branding_settings
     WHERE government_structure_id = :governmentStructureId
     LIMIT 1`,
    {
      replacements: { governmentStructureId: branding.government_structure_id },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) {
    const setClause = BRANDING_COLUMNS.map((col) => `${col} = :${col}`).join(", ");
    await queryInterface.sequelize.query(
      `UPDATE branding_settings
       SET ${setClause}, updated_at = :updated_at
       WHERE government_structure_id = :government_structure_id`,
      {
        replacements: {
          ...branding,
          updated_at: now,
        },
      }
    );
    return "updated";
  }

  await queryInterface.bulkInsert("branding_settings", [
    {
      ...branding,
      created_at: now,
      updated_at: now,
    },
  ]);
  return "created";
}

async function updateSectorLogo(queryInterface, structureId, logoPath, now) {
  await queryInterface.sequelize.query(
    `UPDATE government_structures
     SET logo_path = :logoPath, updated_at = :now
     WHERE government_structure_id = :structureId`,
    {
      replacements: { structureId, logoPath, now },
    }
  );
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const parent = await findSectorByName(queryInterface, PARENT_SECTOR_NAME, null);
    if (!parent) {
      console.warn(
        `Parent sector "${PARENT_SECTOR_NAME}" not found. Run seed:minster-mom or create the sector first.`
      );
      return;
    }

    console.log(`Parent "${parent.name}" (${parent.government_structure_id}) uses global default branding.`);

    for (const entry of CHILD_SECTOR_BRANDING) {
      const sector = await findSectorByName(
        queryInterface,
        entry.sectorName,
        parent.government_structure_id
      );

      if (!sector) {
        console.warn(
          `Skipping branding for "${entry.sectorName}": child sector not found under "${parent.name}".`
        );
        continue;
      }

      const branding = entry.buildBranding(sector.government_structure_id);
      const action = await upsertSectorBranding(queryInterface, branding, now);
      await updateSectorLogo(queryInterface, sector.government_structure_id, entry.logoPath, now);

      console.log(
        `${action === "created" ? "Created" : "Updated"} ${entry.sectorName} branding (${sector.government_structure_id}, ${entry.logoPath})`
      );
    }
  },

  async down(queryInterface) {
    const parent = await findSectorByName(queryInterface, PARENT_SECTOR_NAME, null);
    if (!parent) return;

    const childIds = [];
    for (const entry of CHILD_SECTOR_BRANDING) {
      const sector = await findSectorByName(
        queryInterface,
        entry.sectorName,
        parent.government_structure_id
      );
      if (sector) childIds.push(sector.government_structure_id);
    }

    if (childIds.length > 0) {
      await queryInterface.sequelize.query(
        `DELETE FROM branding_settings WHERE government_structure_id IN (:childIds)`,
        { replacements: { childIds } }
      );

      await queryInterface.sequelize.query(
        `UPDATE government_structures
         SET logo_path = NULL, updated_at = :now
         WHERE government_structure_id IN (:childIds)`,
        { replacements: { childIds, now: new Date() } }
      );
    }

    await queryInterface.bulkDelete("branding_settings", {
      branding_setting_id: [BRANDING_IDS.MIDI, BRANDING_IDS.GIE],
    });

    console.log("Removed MIDI and GIE sector branding overrides under Minster Of Mines.");
  },
};
