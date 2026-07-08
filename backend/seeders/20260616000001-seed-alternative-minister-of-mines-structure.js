"use strict";

const {
    SECTOR_ID,
    SECTOR_NAME,
    SECTOR_DESCRIPTION,
    DEPARTMENT_TREE,
} = require("./data/alternativeMomOrganogram.data");
const {
    flattenDepartmentTree,
    clearSectorDepartments,
    clearDepartmentsByIds,
    seedTwoUsersPerDepartment,
} = require("./utils/organogramSeederUtils");

const SECTOR_KEY = "alt-mom";

async function ensureSector(queryInterface, now) {
    const byCanonicalId = await queryInterface.sequelize.query(
        `SELECT government_structure_id, name FROM government_structures
         WHERE government_structure_id = :id
         LIMIT 1`,
        {
            replacements: { id: SECTOR_ID },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (byCanonicalId.length > 0) {
        await queryInterface.sequelize.query(
            `UPDATE government_structures
             SET name = :name, is_active = true, updated_at = :now
             WHERE government_structure_id = :id`,
            {
                replacements: { id: SECTOR_ID, name: SECTOR_NAME, now },
            }
        );
        return SECTOR_ID;
    }

    const byExactName = await queryInterface.sequelize.query(
        `SELECT government_structure_id, name FROM government_structures
         WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name))
         LIMIT 1`,
        {
            replacements: { name: SECTOR_NAME },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (byExactName.length > 0) {
        const resolvedId = byExactName[0].government_structure_id;
        if (resolvedId !== SECTOR_ID) {
            console.warn(
                `  Warning: "${SECTOR_NAME}" exists as ${resolvedId}, expected ${SECTOR_ID}. ` +
                    "Using canonical organogram sector ID for department sync."
            );
        } else {
            await queryInterface.sequelize.query(
                `UPDATE government_structures
                 SET is_active = true, updated_at = :now
                 WHERE government_structure_id = :id`,
                { replacements: { id: SECTOR_ID, now } }
            );
            return SECTOR_ID;
        }
    }

    await queryInterface.bulkInsert("government_structures", [
        {
            government_structure_id: SECTOR_ID,
            parent_id: null,
            name: SECTOR_NAME,
            level: 1,
            is_active: true,
            created_at: now,
            updated_at: now,
        },
    ]);

    return SECTOR_ID;
}

module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const sectorId = await ensureSector(queryInterface, now);

        const departmentRows = [];
        flattenDepartmentTree(DEPARTMENT_TREE, sectorId, SECTOR_KEY, null, 1, "", departmentRows);

        await clearSectorDepartments(queryInterface, sectorId);
        await clearDepartmentsByIds(
            queryInterface,
            departmentRows.map((row) => row.internal_structure_id)
        );

        const insertRows = departmentRows.map(({ nodePath, ...row }) => ({
            ...row,
            created_at: now,
            updated_at: now,
        }));

        await queryInterface.bulkInsert("internal_structures", insertRows);

        const userCount = await seedTwoUsersPerDepartment(queryInterface, {
            sectorId,
            sectorKey: SECTOR_KEY,
            departmentRows,
            now,
        });

        console.log(`Synced sector: ${SECTOR_NAME}`);
        console.log(`  Sector ID: ${sectorId}`);
        console.log(`  Departments/units: ${departmentRows.length} (root: Minister)`);
        console.log(`  Demo users: ${userCount} (2 per department, password: password)`);
        console.log(`  Excluded: Ethiopian Geological Institute, Mining Industry Development Institute`);
        console.log(`  Source: MoM organogram (Alternative Institutional Structure 2016 E.C.)`);
    },

    async down(queryInterface) {
        await clearSectorDepartments(queryInterface, SECTOR_ID);
        await queryInterface.bulkDelete("government_structures", {
            government_structure_id: SECTOR_ID,
        });
        console.log(`Removed sector "${SECTOR_NAME}", its departments, and demo users.`);
    },
};
