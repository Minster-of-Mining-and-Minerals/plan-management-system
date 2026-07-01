"use strict";

const { SECTORS } = require("./data/minsterOfMinesStructure.data");
const { MOM_USER_TEMPLATES } = require("./data/momOrgHierarchy.data");
const {
  flattenDepartmentTree,
  clearSectorDepartments,
  ensureGovernmentSector,
  seedTwoUsersPerDepartment,
} = require("./utils/organogramSeederUtils");

async function findSectorByName(queryInterface, name, parentId = null) {
  const parentClause =
    parentId === null
      ? "parent_id IS NULL"
      : "parent_id = :parentId";
  const replacements = parentId === null ? { name } : { name, parentId };

  const rows = await queryInterface.sequelize.query(
    `SELECT government_structure_id, name, parent_id, level
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

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    let totalDepartments = 0;
    let totalUsers = 0;

    const parentConfig = SECTORS.find((s) => s.parentId === null);
    let parentSectorId = parentConfig.id;

    const existingParent = await findSectorByName(queryInterface, parentConfig.name, null);
    if (existingParent) {
      parentSectorId = existingParent.government_structure_id;
      await queryInterface.sequelize.query(
        `UPDATE government_structures
         SET parent_id = NULL, level = 1, is_active = true, updated_at = :now
         WHERE government_structure_id = :id`,
        { replacements: { id: parentSectorId, now } }
      );
      console.log(`Using existing parent sector: "${existingParent.name}" (${parentSectorId})`);
    } else {
      parentSectorId = await ensureGovernmentSector(
        queryInterface,
        {
          id: parentConfig.id,
          name: parentConfig.name,
          parentId: null,
          level: 1,
        },
        now
      );
      console.log(`Created parent sector: "${parentConfig.name}"`);
    }

    for (const sector of SECTORS) {
      const isParent = sector.parentId === null;
      let sectorId = sector.id;

      if (!isParent) {
        const existing = await findSectorByName(queryInterface, sector.name, parentSectorId);
        if (existing) {
          sectorId = existing.government_structure_id;
          await queryInterface.sequelize.query(
            `UPDATE government_structures
             SET parent_id = :parentId, level = :level, is_active = true,
                 logo_path = COALESCE(:logoPath, logo_path), updated_at = :now
             WHERE government_structure_id = :id`,
            {
              replacements: {
                id: sectorId,
                parentId: parentSectorId,
                level: sector.level,
                logoPath: sector.logoPath ?? null,
                now,
              },
            }
          );
          console.log(`Using existing sub-sector: "${sector.name}" (${sectorId})`);
        } else {
          sectorId = await ensureGovernmentSector(
            queryInterface,
            {
              id: sector.id,
              name: sector.name,
              parentId: parentSectorId,
              level: sector.level,
              logoPath: sector.logoPath ?? null,
            },
            now
          );
          console.log(`Created sub-sector: "${sector.name}"`);
        }
      } else {
        sectorId = parentSectorId;
      }

      await clearSectorDepartments(queryInterface, sectorId);

      const departmentRows = [];
      flattenDepartmentTree(
        sector.departmentTree,
        sectorId,
        sector.sectorKey,
        null,
        1,
        "",
        departmentRows
      );

      const insertRows = departmentRows.map(({ nodePath, ...row }) => ({
        ...row,
        created_at: now,
        updated_at: now,
      }));

      if (insertRows.length > 0) {
        await queryInterface.bulkInsert("internal_structures", insertRows);
      }

      const userCount = await seedTwoUsersPerDepartment(queryInterface, {
        sectorId,
        sectorKey: sector.sectorKey,
        departmentRows,
        now,
        templates: MOM_USER_TEMPLATES,
      });

      totalDepartments += departmentRows.length;
      totalUsers += userCount;

      console.log(`  ${sector.name}: ${departmentRows.length} departments, ${userCount} users`);
    }

    console.log("");
    console.log("Minster Of Mines org hierarchy seeded.");
    console.log(`  Sectors: ${SECTORS.length} (Minster Of Mines + MIDI + GIE)`);
    console.log(`  Departments: ${totalDepartments} (7 per sector: 1 root + 2 subs + 4 children)`);
    console.log(`  Users: ${totalUsers} (2 per department, password: password)`);
    console.log("  Email: {sector-key}.{dept-path}.{head|officer}@mom-demo.et");
  },

  async down(queryInterface) {
    const { SECTOR_IDS } = require("./data/minsterOfMinesStructure.data");

    for (const sectorId of [SECTOR_IDS.GIE, SECTOR_IDS.MIDI, SECTOR_IDS.MINSTER]) {
      await clearSectorDepartments(queryInterface, sectorId);
      await queryInterface.bulkDelete("government_structures", {
        government_structure_id: sectorId,
      });
    }

    console.log("Removed Minster Of Mines sectors, departments, and demo users.");
  },
};
