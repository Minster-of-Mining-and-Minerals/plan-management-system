"use strict";

const { v4: uuidv4, v5: uuidv5 } = require("uuid");
const bcrypt = require("bcrypt");
const { USER_ROLE_ID, MOM_USER_TEMPLATES } = require("../data/momOrgHierarchy.data");

const ID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";

function entityId(type, path) {
    return uuidv5(`${type}:${path}`, ID_NAMESPACE);
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function deptShortName(name) {
    return name
        .replace(/\s+(Directorate|Department|Office|Desk|Officer|Lead)$/i, "")
        .replace(/^Chief Executive$/i, "Executive")
        .replace(/^Director General$/i, "Director General")
        .trim();
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
            nodePath,
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

function buildDepartmentUsers({
    sectorKey,
    sectorId,
    departmentRows,
    templates,
    counters,
    userRoleId,
}) {
    const users = [];
    const userRoles = [];

    for (const dept of departmentRows) {
        const pathBase = dept.nodePath || slugify(dept.name);
        const short = deptShortName(dept.name);

        for (const template of templates) {
            const userPath = `${sectorKey}/${pathBase}/${template.roleKey}`;
            const userId = entityId("user", userPath);
            const emailSlug = `${sectorKey}.${slugify(userPath.replace(/\//g, "."))}@mom-demo.et`;
            const phoneSuffix = String(
                parseInt(userId.replace(/-/g, "").slice(0, 10), 16) % 10_000_000
            ).padStart(7, "0");

            users.push({
                user_id: userId,
                full_name: template.namePattern(short),
                email: emailSlug,
                password: counters.passwordHash,
                phone_number: `2519${phoneSuffix}`,
                profile_image: null,
                is_first_logged_in: false,
                last_login_at: null,
                password_changed_at: null,
                is_active: true,
                government_structure_id: sectorId,
                internal_structure_id: dept.internal_structure_id,
                created_at: counters.now,
                updated_at: counters.now,
            });

            userRoles.push({
                user_role_id: uuidv4(),
                user_id: userId,
                role_id: userRoleId,
                assigned_at: counters.now,
                is_active: true,
                created_at: counters.now,
                updated_at: counters.now,
            });
        }
    }

    return { users, userRoles };
}

async function ensureUserRole(queryInterface, now) {
    const existing = await queryInterface.sequelize.query(
        `SELECT role_id FROM roles WHERE role_id = :id OR LOWER(name) = 'user' LIMIT 1`,
        {
            replacements: { id: USER_ROLE_ID },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (existing.length === 0) {
        await queryInterface.bulkInsert("roles", [
            {
                role_id: USER_ROLE_ID,
                name: "User",
                description: "Standard user with no administrative permissions.",
                is_active: true,
                created_at: now,
                updated_at: now,
            },
        ]);
    }

    return existing.length > 0 ? existing[0].role_id : USER_ROLE_ID;
}

async function removeSectorDemoUsers(queryInterface, sectorId) {
    await queryInterface.sequelize.query(
        `DELETE FROM user_roles
         WHERE user_id IN (
           SELECT user_id FROM users
           WHERE government_structure_id = :sectorId
             AND user_id != :adminId
         )`,
        { replacements: { sectorId, adminId: ADMIN_USER_ID } }
    );

    await queryInterface.sequelize.query(
        `DELETE FROM users
         WHERE government_structure_id = :sectorId
           AND user_id != :adminId`,
        { replacements: { sectorId, adminId: ADMIN_USER_ID } }
    );
}

async function seedTwoUsersPerDepartment(queryInterface, {
    sectorId,
    sectorKey,
    departmentRows,
    now,
    templates = MOM_USER_TEMPLATES,
}) {
    if (!departmentRows.length) {
        return 0;
    }

    const passwordHash = await bcrypt.hash("password", 10);
    const userRoleId = await ensureUserRole(queryInterface, now);
    const counters = { phone: 0, passwordHash, now };

    const { users, userRoles } = buildDepartmentUsers({
        sectorKey,
        sectorId,
        departmentRows,
        templates,
        counters,
        userRoleId,
    });

    if (users.length > 0) {
        await queryInterface.bulkInsert("users", users);
        await queryInterface.bulkInsert("user_roles", userRoles);
    }

    return users.length;
}

const SECTOR_KEY_BY_ID = {
    "10000000-0000-4000-8000-000000000001": "mom",
    "10000000-0000-4000-8000-000000000002": "midi",
    "10000000-0000-4000-8000-000000000003": "gie",
    "10000000-0000-4000-8000-000000000004": "alt-mom",
    "10000000-0000-4000-8000-000000000005": "alt-mom-egi",
    "10000000-0000-4000-8000-000000000006": "alt-mom-midi",
};

function resolveSectorKey(sectorId, sectorName) {
    return SECTOR_KEY_BY_ID[sectorId] || slugify(sectorName || "sector");
}

function buildDepartmentNodePaths(departments) {
    const byId = new Map(departments.map((dept) => [dept.internal_structure_id, dept]));

    function pathFor(dept) {
        if (!dept.parent_id) {
            return slugify(dept.name);
        }
        const parent = byId.get(dept.parent_id);
        if (!parent) {
            return slugify(dept.name);
        }
        return `${pathFor(parent)}/${slugify(dept.name)}`;
    }

    return departments.map((dept) => ({
        internal_structure_id: dept.internal_structure_id,
        government_structure_id: dept.government_structure_id,
        name: dept.name,
        nodePath: pathFor(dept),
    }));
}

async function loadExistingOrganogramDepartments(queryInterface) {
    return queryInterface.sequelize.query(
        `SELECT internal_structure_id, government_structure_id, parent_id, name
         FROM internal_structures
         WHERE is_active = true
         ORDER BY government_structure_id, level, name`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
}

async function loadExistingUserIds(queryInterface) {
    const rows = await queryInterface.sequelize.query(
        `SELECT user_id FROM users`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    return new Set(rows.map((row) => row.user_id));
}

async function countUsersPerDepartment(queryInterface) {
    const rows = await queryInterface.sequelize.query(
        `SELECT internal_structure_id, COUNT(*)::int AS user_count
         FROM users
         WHERE internal_structure_id IS NOT NULL
           AND user_id != :adminId
         GROUP BY internal_structure_id`,
        {
            replacements: { adminId: ADMIN_USER_ID },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );
    return new Map(rows.map((row) => [row.internal_structure_id, row.user_count]));
}

/**
 * Add demo users (2 per department) to an existing organogram without changing structure.
 * Skips departments that already have 2+ users and users that already exist (by id).
 */
async function seedUsersForExistingOrganogram(queryInterface, { now = new Date(), templates = MOM_USER_TEMPLATES } = {}) {
    const sectors = await queryInterface.sequelize.query(
        `SELECT government_structure_id, name FROM government_structures WHERE is_active = true`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (sectors.length === 0) {
        return { departments: 0, usersCreated: 0, skippedDepartments: 0 };
    }

    const allDepartments = await loadExistingOrganogramDepartments(queryInterface);
    if (allDepartments.length === 0) {
        return { departments: 0, usersCreated: 0, skippedDepartments: 0 };
    }

    const usersByDept = await countUsersPerDepartment(queryInterface);
    const existingUserIds = await loadExistingUserIds(queryInterface);
    const passwordHash = await bcrypt.hash("password", 10);
    const userRoleId = await ensureUserRole(queryInterface, now);

    const phoneRows = await queryInterface.sequelize.query(
        `SELECT phone_number FROM users WHERE phone_number IS NOT NULL`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    let phoneCounter = phoneRows.length;

    const departmentsBySector = new Map();
    for (const dept of allDepartments) {
        const list = departmentsBySector.get(dept.government_structure_id) || [];
        list.push(dept);
        departmentsBySector.set(dept.government_structure_id, list);
    }

    const usersToInsert = [];
    const userRolesToInsert = [];
    let skippedDepartments = 0;

    for (const sector of sectors) {
        const sectorDepartments = departmentsBySector.get(sector.government_structure_id) || [];
        if (!sectorDepartments.length) continue;

        const sectorKey = resolveSectorKey(sector.government_structure_id, sector.name);
        const departmentRows = buildDepartmentNodePaths(sectorDepartments);

        for (const dept of departmentRows) {
            const existingCount = usersByDept.get(dept.internal_structure_id) || 0;
            if (existingCount >= templates.length) {
                skippedDepartments += 1;
                continue;
            }

            const templatesNeeded = templates.slice(existingCount);
            const short = deptShortName(dept.name);

            for (const template of templatesNeeded) {
                const userPath = `${sectorKey}/${dept.nodePath}/${template.roleKey}`;
                const userId = entityId("user", userPath);
                if (existingUserIds.has(userId)) {
                    continue;
                }

                const phoneSuffix = String(
                    parseInt(userId.replace(/-/g, "").slice(0, 10), 16) % 10_000_000
                ).padStart(7, "0");

                usersToInsert.push({
                    user_id: userId,
                    full_name: template.namePattern(short),
                    email: `${sectorKey}.${slugify(userPath.replace(/\//g, "."))}@mom-demo.et`,
                    password: passwordHash,
                    phone_number: `2519${phoneSuffix}`,
                    profile_image: null,
                    is_first_logged_in: false,
                    last_login_at: null,
                    password_changed_at: null,
                    is_active: true,
                    government_structure_id: sector.government_structure_id,
                    internal_structure_id: dept.internal_structure_id,
                    created_at: now,
                    updated_at: now,
                });

                userRolesToInsert.push({
                    user_role_id: uuidv4(),
                    user_id: userId,
                    role_id: userRoleId,
                    assigned_at: now,
                    is_active: true,
                    created_at: now,
                    updated_at: now,
                });

                existingUserIds.add(userId);
            }
        }
    }

    if (usersToInsert.length > 0) {
        await queryInterface.bulkInsert("users", usersToInsert);
        await queryInterface.bulkInsert("user_roles", userRolesToInsert);
    }

    return {
        departments: allDepartments.length,
        usersCreated: usersToInsert.length,
        skippedDepartments,
    };
}

async function clearSectorDepartments(queryInterface, sectorId) {
    const deptRows = await queryInterface.sequelize.query(
        `SELECT internal_structure_id FROM internal_structures WHERE government_structure_id = :sectorId`,
        {
            replacements: { sectorId },
            type: queryInterface.sequelize.QueryTypes.SELECT,
        }
    );

    if (deptRows.length > 0) {
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

    await removeSectorDemoUsers(queryInterface, sectorId);
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

    const insertRows = departmentRows.map(({ nodePath, ...row }) => ({
        ...row,
        created_at: now,
        updated_at: now,
    }));

    if (insertRows.length > 0) {
        await queryInterface.bulkInsert("internal_structures", insertRows);
    }

    return departmentRows;
}

module.exports = {
    entityId,
    slugify,
    deptShortName,
    flattenDepartmentTree,
    buildDepartmentUsers,
    ensureUserRole,
    removeSectorDemoUsers,
    seedTwoUsersPerDepartment,
    seedUsersForExistingOrganogram,
    clearSectorDepartments,
    ensureGovernmentSector,
    syncSectorDepartmentTree,
};
