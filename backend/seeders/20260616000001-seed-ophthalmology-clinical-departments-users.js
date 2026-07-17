"use strict";

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { copyStructure } = require("../services/diagnosisStructureCopy");
const {
  ADMIN_USER_ID,
  CLINICAL_DEPARTMENTS,
  CLINICAL_ROLES,
  DEMO_EMAIL_DOMAIN,
  OPHTHALMOLOGY_DEMO_STAFF,
  ROLE_PERMISSION_MATRIX,
} = require("../config/clinicalDemoSeedConstants");
const { assertDemoSeedAllowed } = require("../utils/assertDemoSeedAllowed");

const DEMO_PASSWORD = "password";

async function findPermissionId(queryInterface, resource, action) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions
     WHERE resource = :resource AND action = :action AND is_active = true LIMIT 1`,
    { replacements: { resource, action } }
  );
  return rows[0]?.permission_id || null;
}

async function linkRolePermission(queryInterface, roleId, permissionId, now) {
  if (!roleId || !permissionId) return;
  const [existing] = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions
     WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
    { replacements: { roleId, permissionId } }
  );
  if (existing.length) return;
  await queryInterface.bulkInsert("role_permissions", [
    {
      role_permission_id: uuidv4(),
      role_id: roleId,
      permission_id: permissionId,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
}

async function ensureRolePermissions(queryInterface, roleIdByName, now) {
  for (const [roleName, matrix] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleId = roleIdByName[roleName];
    if (!roleId) continue;
    for (const [resource, actions] of Object.entries(matrix)) {
      for (const action of actions) {
        const permissionId = await findPermissionId(queryInterface, resource, action);
        await linkRolePermission(queryInterface, roleId, permissionId, now);
      }
    }
  }
}

async function ensureDiagnosisConfig(
  queryInterface,
  { staffId, templateTitle, configTitle, actorId, now }
) {
  const [existing] = await queryInterface.sequelize.query(
    `SELECT config_id FROM diagnosis_form_configs
     WHERE assigned_staff_id = :staffId AND title = :configTitle LIMIT 1`,
    { replacements: { staffId, configTitle } }
  );
  if (existing.length) return existing[0].config_id;

  const [templates] = await queryInterface.sequelize.query(
    `SELECT template_id FROM diagnosis_templates WHERE title = :title LIMIT 1`,
    { replacements: { title: templateTitle } }
  );
  if (!templates.length) {
    console.warn(
      `[ophthalmology-demo-seed] Template not found: ${templateTitle} — skip config for staff ${staffId}`
    );
    return null;
  }

  const configId = uuidv4();
  await queryInterface.bulkInsert("diagnosis_form_configs", [
    {
      config_id: configId,
      assigned_staff_id: staffId,
      title: configTitle,
      description: `Demo workflow form — ${configTitle}`,
      source_template_id: templates[0].template_id,
      is_active: true,
      sort_order: 1,
      created_by: actorId,
      updated_by: actorId,
      created_at: now,
      updated_at: now,
    },
  ]);

  await copyStructure({
    sourceTemplateId: templates[0].template_id,
    targetConfigId: configId,
  });

  return configId;
}

module.exports = {
  async up(queryInterface) {
    assertDemoSeedAllowed("ophthalmology-clinical-departments-users");
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // —— Departments ——
    for (const dept of CLINICAL_DEPARTMENTS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT department_id FROM departments
         WHERE code = :code OR department_id = :department_id LIMIT 1`,
        {
          replacements: {
            code: dept.code,
            department_id: dept.department_id,
          },
        }
      );
      if (!existing.length) {
        await queryInterface.bulkInsert("departments", [
          {
            department_id: dept.department_id,
            name: dept.name,
            code: dept.code,
            slug: dept.slug,
            status: "active",
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    const [deptRows] = await queryInterface.sequelize.query(
      `SELECT department_id, code FROM departments WHERE code IN (:codes)`,
      {
        replacements: {
          codes: CLINICAL_DEPARTMENTS.map((d) => d.code),
        },
      }
    );
    const deptIdByCode = Object.fromEntries(deptRows.map((d) => [d.code, d.department_id]));

    // —— Clinical roles ——
    for (const role of CLINICAL_ROLES) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT role_id FROM roles WHERE name = :name OR role_id = :role_id LIMIT 1`,
        { replacements: { name: role.name, role_id: role.role_id } }
      );
      if (!existing.length) {
        await queryInterface.bulkInsert("roles", [
          {
            role_id: role.role_id,
            name: role.name,
            description: role.description,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    const [roleRows] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE name IN (:names)`,
      {
        replacements: { names: CLINICAL_ROLES.map((r) => r.name) },
      }
    );
    const roleIdByName = Object.fromEntries(roleRows.map((r) => [r.name, r.role_id]));

    await ensureRolePermissions(queryInterface, roleIdByName, now);

    // —— User titles lookup ——
    const [titleRows] = await queryInterface.sequelize.query(
      `SELECT title_id, code FROM user_titles WHERE status = 'active'`
    );
    const titleIdByCode = Object.fromEntries(titleRows.map((t) => [t.code, t.title_id]));

    // —— Demo staff users ——
    for (const staff of OPHTHALMOLOGY_DEMO_STAFF) {
      const [existingUser] = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE email = :email OR user_id = :user_id LIMIT 1`,
        { replacements: { email: staff.email, user_id: staff.user_id } }
      );

      let userId = existingUser[0]?.user_id;
      if (!userId) {
        userId = staff.user_id;
        await queryInterface.bulkInsert("users", [
          {
            user_id: userId,
            full_name: staff.full_name,
            email: staff.email,
            password: passwordHash,
            phone_number: staff.phone_number,
            is_first_logged_in: false,
            is_active: true,
            account_type: "INTERNAL",
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      const departmentId = deptIdByCode[staff.department_code] || null;
      const titleId = titleIdByCode[staff.title_code] || null;

      const [existingProfile] = await queryInterface.sequelize.query(
        `SELECT profile_id FROM internal_user_profiles WHERE user_id = :userId LIMIT 1`,
        { replacements: { userId } }
      );

      if (!existingProfile.length) {
        await queryInterface.bulkInsert("internal_user_profiles", [
          {
            profile_id: uuidv4(),
            user_id: userId,
            department_id: departmentId,
            department: staff.department_code,
            title_id: titleId,
            job_title: staff.job_title,
            employee_id: staff.employee_id,
            metadata: JSON.stringify({ demo_seed: "ophthalmology_clinic" }),
            created_at: now,
            updated_at: now,
          },
        ]);
      } else {
        await queryInterface.sequelize.query(
          `UPDATE internal_user_profiles
           SET department_id = :departmentId,
               department = :departmentCode,
               title_id = :titleId,
               job_title = :jobTitle,
               employee_id = :employeeId,
               updated_at = :now
           WHERE user_id = :userId`,
          {
            replacements: {
              userId,
              departmentId,
              departmentCode: staff.department_code,
              titleId,
              jobTitle: staff.job_title,
              employeeId: staff.employee_id,
              now,
            },
          }
        );
      }

      const roleId = roleIdByName[staff.role_name];
      if (roleId) {
        const [existingRole] = await queryInterface.sequelize.query(
          `SELECT user_role_id FROM user_roles
           WHERE user_id = :userId AND role_id = :roleId LIMIT 1`,
          { replacements: { userId, roleId } }
        );
        if (!existingRole.length) {
          await queryInterface.bulkInsert("user_roles", [
            {
              user_role_id: uuidv4(),
              user_id: userId,
              role_id: roleId,
              assigned_by: ADMIN_USER_ID,
              assigned_at: now,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }

      if (staff.diagnosis) {
        await ensureDiagnosisConfig(queryInterface, {
          staffId: userId,
          templateTitle: staff.diagnosis.template_title,
          configTitle: staff.diagnosis.config_title,
          actorId: ADMIN_USER_ID,
          now,
        });
      }
    }

    // —— Department heads ——
    for (const staff of OPHTHALMOLOGY_DEMO_STAFF) {
      if (!staff.is_dept_head) continue;
      const departmentId = deptIdByCode[staff.is_dept_head];
      if (!departmentId) continue;
      await queryInterface.sequelize.query(
        `UPDATE departments SET dept_head = :userId, updated_at = :now
         WHERE department_id = :departmentId AND (dept_head IS NULL OR dept_head = :userId)`,
        {
          replacements: {
            userId: staff.user_id,
            departmentId,
            now,
          },
        }
      );
    }

    console.log(
      "[ophthalmology-demo-seed] Seeded departments, roles, and demo staff.",
      `Login password for all @ophthalmology.demo accounts: ${DEMO_PASSWORD}`
    );
  },

  async down(queryInterface, Sequelize) {
    const emails = OPHTHALMOLOGY_DEMO_STAFF.map((s) => s.email);
    const userIds = OPHTHALMOLOGY_DEMO_STAFF.map((s) => s.user_id);

    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE email IN (:emails)`,
      { replacements: { emails } }
    );
    const resolvedUserIds = users.map((u) => u.user_id);

    if (resolvedUserIds.length) {
      await queryInterface.bulkDelete("diagnosis_form_configs", {
        assigned_staff_id: { [Sequelize.Op.in]: resolvedUserIds },
      });
      await queryInterface.bulkDelete("user_roles", {
        user_id: { [Sequelize.Op.in]: resolvedUserIds },
      });
      await queryInterface.bulkDelete("internal_user_profiles", {
        user_id: { [Sequelize.Op.in]: resolvedUserIds },
      });
      await queryInterface.bulkDelete("users", {
        user_id: { [Sequelize.Op.in]: resolvedUserIds },
      });
    }

    await queryInterface.sequelize.query(
      `UPDATE departments SET dept_head = NULL
       WHERE dept_head IN (:userIds)`,
      { replacements: { userIds: resolvedUserIds.length ? resolvedUserIds : userIds } }
    );

    await queryInterface.bulkDelete("departments", {
      department_id: {
        [Sequelize.Op.in]: CLINICAL_DEPARTMENTS.map((d) => d.department_id),
      },
    });

    const roleIds = CLINICAL_ROLES.map((r) => r.role_id);
    await queryInterface.bulkDelete("role_permissions", {
      role_id: { [Sequelize.Op.in]: roleIds },
    });
    await queryInterface.bulkDelete("roles", {
      role_id: { [Sequelize.Op.in]: roleIds },
    });
  },
};
