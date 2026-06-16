"use strict";

const { v5: uuidv5 } = require("uuid");
const {
    SECTOR_ID,
    SECTOR_NAME,
    SECTOR_DESCRIPTION,
    DEPARTMENT_TREE,
} = require("./data/alternativeMomOrganogram.data");

const ID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const SECTOR_KEY = "alt-mom";

function entityId(type, path) {
    return uuidv5(`${type}:${path}`, ID_NAMESPACE);
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function flattenDepartmentTree(nodes, sectorId, parentId, level, pathPrefix, rows) {
    for (const node of nodes) {
        const nodePath = pathPrefix ? `${pathPrefix}/${slugify(node.name)}` : slugify(node.name);
        const nodeId = entityId("department", `${SECTOR_KEY}/${nodePath}`);

        rows.push({
            internal_structure_id: nodeId,
            government_structure_id: sectorId,
            parent_id: parentId,
            name: node.name,
            level,
            is_active: true,
        });

        if (node.children?.length) {
            flattenDepartmentTree(
                node.children,
                sectorId,
                nodeId,
                level + 1,
                nodePath,
                rows
            );
        }
    }
}

async function clearSectorDepartments(queryInterface, sectorId) {
    const deptRows = await queryInterface.sequelize.query(
        `SELECT internal_structure_id FROM internal_structures WHERE government_structure_id = :sectorId`,
        {
            replacements: { sectorId },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (deptRows.length === 0) {
        return;
    }

    const deptIds = deptRows.map((row) => row.internal_structure_id);

    await queryInterface.sequelize.query(
        `UPDATE users SET internal_structure_id = NULL
         WHERE internal_structure_id IN (:deptIds)`,
        { replacements: { deptIds } }
    );

    await queryInterface.sequelize.query(
        `DELETE FROM internal_assignments WHERE internal_structure_id IN (:deptIds)`,
        { replacements: { deptIds } }
    );

    await queryInterface.sequelize.query(
        `DELETE FROM internal_structures WHERE government_structure_id = :sectorId`,
        { replacements: { sectorId } }
    );
}

async function ensureSector(queryInterface, now) {
    const existingSector = await queryInterface.sequelize.query(
        `SELECT government_structure_id FROM government_structures
         WHERE government_structure_id = :id OR name = :name
         LIMIT 1`,
        {
            replacements: { id: SECTOR_ID, name: SECTOR_NAME },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (existingSector.length > 0) {
        return existingSector[0].government_structure_id;
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

        await clearSectorDepartments(queryInterface, sectorId);

        const departmentRows = [];
        flattenDepartmentTree(DEPARTMENT_TREE, sectorId, null, 1, "", departmentRows);

        for (const row of departmentRows) {
            row.created_at = now;
            row.updated_at = now;
        }

        await queryInterface.bulkInsert("internal_structures", departmentRows);

        console.log(`Synced sector: ${SECTOR_NAME}`);
        console.log(`  Sector ID: ${sectorId}`);
        console.log(`  Departments/units: ${departmentRows.length} (root: Minister)`);
        console.log(`  Excluded: Ethiopian Geological Institute, Mining Industry Development Institute`);
        console.log(`  Source: MoM organogram (Alternative Institutional Structure 2016 E.C.)`);
    },

    async down(queryInterface) {
        await clearSectorDepartments(queryInterface, SECTOR_ID);
        await queryInterface.bulkDelete("government_structures", {
            government_structure_id: SECTOR_ID,
        });
        console.log(`Removed sector "${SECTOR_NAME}" and its departments.`);
    },
};
