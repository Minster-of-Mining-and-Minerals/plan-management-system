"use strict";

const { v5: uuidv5 } = require("uuid");

const ID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function entityId(type, path) {
    return uuidv5(`${type}:${path}`, ID_NAMESPACE);
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function flattenDepartmentTree(nodes, sectorId, sectorKey, parentId, level, pathPrefix, rows) {
    for (const node of nodes) {
        const nodePath = pathPrefix ? `${pathPrefix}/${slugify(node.name)}` : slugify(node.name);
        const nodeId = entityId("department", `${sectorKey}/${nodePath}`);

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
                sectorKey,
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

async function ensureGovernmentSector(queryInterface, sector, now) {
    const existingSector = await queryInterface.sequelize.query(
        `SELECT government_structure_id FROM government_structures
         WHERE government_structure_id = :id OR name = :name
         LIMIT 1`,
        {
            replacements: { id: sector.id, name: sector.name },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (existingSector.length > 0) {
        await queryInterface.sequelize.query(
            `UPDATE government_structures
             SET parent_id = :parentId, level = :level, updated_at = :now
             WHERE government_structure_id = :id`,
            {
                replacements: {
                    id: existingSector[0].government_structure_id,
                    parentId: sector.parentId,
                    level: sector.level,
                    now,
                },
            }
        );
        return existingSector[0].government_structure_id;
    }

    await queryInterface.bulkInsert("government_structures", [
        {
            government_structure_id: sector.id,
            parent_id: sector.parentId,
            name: sector.name,
            level: sector.level,
            is_active: true,
            created_at: now,
            updated_at: now,
        },
    ]);

    return sector.id;
}

async function syncSectorDepartmentTree(queryInterface, sectorId, sectorKey, departmentTree, now) {
    await clearSectorDepartments(queryInterface, sectorId);

    const departmentRows = [];
    flattenDepartmentTree(departmentTree, sectorId, sectorKey, null, 1, "", departmentRows);

    for (const row of departmentRows) {
        row.created_at = now;
        row.updated_at = now;
    }

    if (departmentRows.length > 0) {
        await queryInterface.bulkInsert("internal_structures", departmentRows);
    }

    return departmentRows.length;
}

module.exports = {
    entityId,
    slugify,
    flattenDepartmentTree,
    clearSectorDepartments,
    ensureGovernmentSector,
    syncSectorDepartmentTree,
};
