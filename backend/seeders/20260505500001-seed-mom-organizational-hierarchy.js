"use strict";

const { v4: uuidv4, v5: uuidv5 } = require("uuid");
const bcrypt = require("bcrypt");
const {
  SECTOR_IDS,
  ADMIN_USER_ID,
  USER_ROLE_ID,
  MOM_DESCRIPTION,
  MIDI_DESCRIPTION,
  GIE_DESCRIPTION,
  MOM_DEPARTMENTS,
  MIDI_DEPARTMENTS,
  GIE_DEPARTMENTS,
  MOM_USER_TEMPLATES,
  DIRECTORATE_USER_TEMPLATES,
  DEPARTMENT_USER_TEMPLATES,
} = require("./data/momOrgHierarchy.data");

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

function deptShortName(name) {
  return name
    .replace(/\s+(Directorate|Department|Office)$/i, "")
    .replace(/^Chief Executive$/i, "Executive")
    .replace(/^Director General$/i, "Director General")
    .trim();
}

async function cleanStructureData(queryInterface) {
  console.log("Cleaning existing structure, department, and demo user data...");

  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));
  const hasTable = (name) => tableNames.includes(name);

  await queryInterface.sequelize.query(`DELETE FROM internal_assignments`);
  await queryInterface.sequelize.query(`DELETE FROM external_assignments`);

  if (hasTable("plan_node_action_logs")) {
    await queryInterface.sequelize.query(`DELETE FROM plan_node_action_logs`);
  }

  if (hasTable("plan_nodes")) {
    await queryInterface.sequelize.query(`DELETE FROM plan_nodes`);
  }

  if (hasTable("plan_versions")) {
    await queryInterface.sequelize.query(
      `UPDATE plan_versions SET based_on_version_id = NULL WHERE based_on_version_id IS NOT NULL`
    );
    await queryInterface.sequelize.query(`DELETE FROM plan_versions`);
  }

  if (hasTable("plan_rule_steps")) {
    await queryInterface.sequelize.query(
      `DELETE FROM plan_rule_steps
       WHERE plan_rule_id IN (
         SELECT plan_rule_id FROM plan_rules WHERE government_structure_id IS NOT NULL
       )`
    );
  }

  if (hasTable("plan_rules")) {
    await queryInterface.sequelize.query(
      `DELETE FROM plan_rules WHERE government_structure_id IS NOT NULL`
    );
  }

  await queryInterface.sequelize.query(`DELETE FROM user_permission_groups`);
  await queryInterface.sequelize.query(
    `DELETE FROM user_roles WHERE user_id != :adminId`,
    { replacements: { adminId: ADMIN_USER_ID } }
  );
  await queryInterface.sequelize.query(
    `DELETE FROM users WHERE user_id != :adminId`,
    { replacements: { adminId: ADMIN_USER_ID } }
  );
  await queryInterface.sequelize.query(`DELETE FROM government_structure_permission_groups`);
  await queryInterface.sequelize.query(`DELETE FROM internal_structures`);
  await queryInterface.sequelize.query(`DELETE FROM government_structures`);

  console.log("Structure and department cleanup complete.");
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
    console.log('Created "User" role with no permissions.');
    return USER_ROLE_ID;
  }

  return existing[0].role_id;
}

function buildSectorRows(now) {
  return [
    {
      government_structure_id: SECTOR_IDS.MOM,
      parent_id: null,
      name: "Ministry of Mines",
      level: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      government_structure_id: SECTOR_IDS.MIDI,
      parent_id: SECTOR_IDS.MOM,
      name: "MIDI",
      level: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      government_structure_id: SECTOR_IDS.GIE,
      parent_id: SECTOR_IDS.MOM,
      name: "GIE",
      level: 2,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

function seedDepartmentsForSector(
  sectorKey,
  sectorId,
  departmentTree,
  now,
  counters,
  userRoleId,
  userTemplates = DIRECTORATE_USER_TEMPLATES
) {
  const internalStructures = [];
  const users = [];
  const userRoles = [];

  departmentTree.forEach((dept) => {
    const deptPath = `${sectorKey}/${slugify(dept.name)}`;
    const deptId = entityId("department", deptPath);

    internalStructures.push({
      internal_structure_id: deptId,
      government_structure_id: sectorId,
      parent_id: null,
      name: dept.name,
      level: 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const short = deptShortName(dept.name);
    userTemplates.forEach((template) => {
      const userPath = `${deptPath}/${template.roleKey}`;
      const user = buildUser({
        path: userPath,
        sectorKey,
        sectorId,
        deptId,
        fullName: template.namePattern(short),
        roleKey: template.roleKey,
        counters,
        userRoleId,
      });
      users.push(user.userRow);
      userRoles.push(user.roleRow);
    });

    (dept.children || []).forEach((child) => {
      const childPath = `${deptPath}/${slugify(child.name)}`;
      const childId = entityId("department", childPath);

      internalStructures.push({
        internal_structure_id: childId,
        government_structure_id: sectorId,
        parent_id: deptId,
        name: child.name,
        level: 2,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      const childShort = deptShortName(child.name);
      userTemplates.forEach((template) => {
        const userPath = `${childPath}/${template.roleKey}`;
        const user = buildUser({
          path: userPath,
          sectorKey,
          sectorId,
          deptId: childId,
          fullName: template.namePattern(childShort),
          roleKey: template.roleKey,
          counters,
          userRoleId,
        });
        users.push(user.userRow);
        userRoles.push(user.roleRow);
      });
    });
  });

  return { internalStructures, users, userRoles };
}

function buildUser({ path, sectorKey, sectorId, deptId, fullName, roleKey, counters, userRoleId }) {
  const userId = entityId("user", path);
  const emailSlug = `${sectorKey}.${slugify(path.replace(/\//g, "."))}@mom-demo.et`;
  counters.phone += 1;

  return {
    userRow: {
      user_id: userId,
      full_name: fullName,
      email: emailSlug,
      password: counters.passwordHash,
      phone_number: `2519${String(1000000 + counters.phone).slice(-7)}`,
      profile_image: null,
      is_first_logged_in: false,
      last_login_at: null,
      password_changed_at: null,
      is_active: true,
      government_structure_id: sectorId,
      internal_structure_id: deptId,
      created_at: counters.now,
      updated_at: counters.now,
    },
    roleRow: {
      user_role_id: uuidv4(),
      user_id: userId,
      role_id: userRoleId,
      assigned_at: counters.now,
      is_active: true,
      created_at: counters.now,
      updated_at: counters.now,
    },
  };
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash("password", 10);

    await cleanStructureData(queryInterface);
    const userRoleId = await ensureUserRole(queryInterface, now);

    await queryInterface.bulkInsert("government_structures", buildSectorRows(now));

    const counters = {
      phone: 0,
      passwordHash,
      now,
    };

    const mom = seedDepartmentsForSector(
      "mom",
      SECTOR_IDS.MOM,
      MOM_DEPARTMENTS,
      now,
      counters,
      userRoleId,
      MOM_USER_TEMPLATES
    );
    const midi = seedDepartmentsForSector(
      "midi",
      SECTOR_IDS.MIDI,
      MIDI_DEPARTMENTS,
      now,
      counters,
      userRoleId,
      MOM_USER_TEMPLATES
    );
    const gie = seedDepartmentsForSector(
      "gie",
      SECTOR_IDS.GIE,
      GIE_DEPARTMENTS,
      now,
      counters,
      userRoleId,
      MOM_USER_TEMPLATES
    );

    const allDepartments = [
      ...mom.internalStructures,
      ...midi.internalStructures,
      ...gie.internalStructures,
    ];
    const allUsers = [...mom.users, ...midi.users, ...gie.users];
    const allUserRoles = [...mom.userRoles, ...midi.userRoles, ...gie.userRoles];

    if (allDepartments.length > 0) {
      await queryInterface.bulkInsert("internal_structures", allDepartments);
    }

    if (allUsers.length > 0) {
      await queryInterface.bulkInsert("users", allUsers);
      await queryInterface.bulkInsert("user_roles", allUserRoles);
    }

    console.log("Ministry of Mines organizational hierarchy seeded successfully.");
    console.log(`  Sectors: 3 (Ministry of Mines, MIDI, GIE)`);
    console.log(`  Departments: ${allDepartments.length}`);
    console.log(`  Demo users: ${allUsers.length} (role: User, password: password)`);
    console.log("");
    console.log("Note: To add demo users to the organogram without resetting structure:");
    console.log("  npm run seed:organogram-users");
    console.log("");
    console.log("Sector descriptions:");
    console.log(`  - Ministry of Mines: ${MOM_DESCRIPTION.slice(0, 80)}...`);
    console.log(`  - MIDI: ${MIDI_DESCRIPTION.slice(0, 80)}...`);
    console.log(`  - GIE: ${GIE_DESCRIPTION.slice(0, 80)}...`);
  },

  async down(queryInterface) {
    await cleanStructureData(queryInterface);
    console.log("Ministry of Mines organizational hierarchy removed.");
  },
};
