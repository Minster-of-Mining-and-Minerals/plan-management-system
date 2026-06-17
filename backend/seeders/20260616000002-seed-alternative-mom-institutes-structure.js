"use strict";

const {
    PARENT_SECTOR_ID,
    PARENT_SECTOR_NAME,
    ROOT_DIRECTOR_GENERAL,
    INSTITUTES,
} = require("./data/alternativeMomInstitutesOrganogram.data");
const {
    clearSectorDepartments,
    ensureGovernmentSector,
    syncSectorDepartmentTree,
} = require("./utils/organogramSeederUtils");

async function ensureParentSector(queryInterface) {
    const parent = await queryInterface.sequelize.query(
        `SELECT government_structure_id FROM government_structures
         WHERE government_structure_id = :id OR name = :name
         LIMIT 1`,
        {
            replacements: { id: PARENT_SECTOR_ID, name: PARENT_SECTOR_NAME },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (parent.length === 0) {
        throw new Error(
            `Parent sector "${PARENT_SECTOR_NAME}" not found. Run seed:alt-mom first.`
        );
    }

    return parent[0].government_structure_id;
}

module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const parentSectorId = await ensureParentSector(queryInterface);

        for (const institute of INSTITUTES) {
            const sectorId = await ensureGovernmentSector(
                queryInterface,
                {
                    id: institute.sectorId,
                    name: institute.name,
                    parentId: parentSectorId,
                    level: 2,
                },
                now
            );

            const departmentCount = await syncSectorDepartmentTree(
                queryInterface,
                sectorId,
                institute.sectorKey,
                institute.departmentTree,
                now
            );

            console.log(`Synced institute sector: ${institute.name}`);
            console.log(`  Sector ID: ${sectorId}`);
            console.log(`  Parent: ${PARENT_SECTOR_NAME}`);
            console.log(`  Departments/units: ${departmentCount} (root: ${ROOT_DIRECTOR_GENERAL})`);
            console.log(`  Description: ${institute.description}`);
        }
    },

    async down(queryInterface) {
        for (const institute of INSTITUTES) {
            await clearSectorDepartments(queryInterface, institute.sectorId);
            await queryInterface.bulkDelete("government_structures", {
                government_structure_id: institute.sectorId,
            });
            console.log(`Removed institute sector "${institute.name}" and its departments.`);
        }
    },
};
