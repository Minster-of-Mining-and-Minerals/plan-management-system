"use strict";

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { copyStructure } = require("../services/diagnosisStructureCopy");
const { assignPatientCodes } = require("../services/qrBarcodeService");
const {
  ADMIN_USER_ID,
  DEMO_PASSWORD,
  TEST_PERMISSION_GROUPS,
  INTERNAL_TEST_STAFF,
  TEST_PATIENTS,
  TEST_PHARMACIES,
  TEST_PHARMACY_USERS,
} = require("../config/professionalTestUsersConstants");
const { assertDemoSeedAllowed } = require("../utils/assertDemoSeedAllowed");

async function findPermissionId(queryInterface, resource, action) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions
     WHERE resource = :resource AND action = :action AND is_active = true LIMIT 1`,
    { replacements: { resource, action } }
  );
  return rows[0]?.permission_id || null;
}

async function ensurePermissionGroup(queryInterface, group, now) {
  const [existing] = await queryInterface.sequelize.query(
    `SELECT permission_group_id FROM permission_groups
     WHERE permission_group_id = :id OR name = :name LIMIT 1`,
    { replacements: { id: group.permission_group_id, name: group.name } }
  );

  let groupId = existing[0]?.permission_group_id;
  if (!groupId) {
    await queryInterface.bulkInsert("permission_groups", [
      {
        permission_group_id: group.permission_group_id,
        name: group.name,
        description: group.description,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
    groupId = group.permission_group_id;
  }

  const desiredPermissionIds = new Set();

  for (const [resource, actions] of Object.entries(group.permissions)) {
    for (const action of actions) {
      const permissionId = await findPermissionId(queryInterface, resource, action);
      if (!permissionId) {
        console.warn(
          `[test-users-seed] Permission not found: ${resource}:${action} — skip for group ${group.name}`
        );
        continue;
      }

      desiredPermissionIds.add(permissionId);

      const [linked] = await queryInterface.sequelize.query(
        `SELECT permission_group_id FROM permission_group_permissions
         WHERE permission_group_id = :groupId AND permission_id = :permissionId LIMIT 1`,
        { replacements: { groupId, permissionId } }
      );
      if (linked.length) continue;

      await queryInterface.bulkInsert("permission_group_permissions", [
        {
          permission_group_id: groupId,
          permission_id: permissionId,
          created_at: now,
        },
      ]);
    }
  }

  const managedResources = Object.keys(group.permissions);
  if (managedResources.length) {
    const [currentLinks] = await queryInterface.sequelize.query(
      `SELECT pgp.permission_id
       FROM permission_group_permissions pgp
       JOIN permissions p ON p.permission_id = pgp.permission_id
       WHERE pgp.permission_group_id = :groupId
         AND p.resource IN (:resources)`,
      { replacements: { groupId, resources: managedResources } }
    );

    for (const link of currentLinks) {
      if (!desiredPermissionIds.has(link.permission_id)) {
        await queryInterface.sequelize.query(
          `DELETE FROM permission_group_permissions
           WHERE permission_group_id = :groupId AND permission_id = :permissionId`,
          { replacements: { groupId, permissionId: link.permission_id } }
        );
      }
    }
  }

  return groupId;
}

async function assignUserToGroup(queryInterface, userId, groupId, now) {
  const [existing] = await queryInterface.sequelize.query(
    `SELECT id FROM user_permission_groups
     WHERE user_id = :userId AND permission_group_id = :groupId LIMIT 1`,
    { replacements: { userId, groupId } }
  );
  if (existing.length) return;

  await queryInterface.bulkInsert("user_permission_groups", [
    {
      id: uuidv4(),
      user_id: userId,
      permission_group_id: groupId,
    },
  ]);
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
      `[test-users-seed] Template not found: ${templateTitle} — skip config for staff ${staffId}`
    );
    return null;
  }

  const configId = uuidv4();
  await queryInterface.bulkInsert("diagnosis_form_configs", [
    {
      config_id: configId,
      assigned_staff_id: staffId,
      title: configTitle,
      description: `Test user workflow form — ${configTitle}`,
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

async function generatePatientCode(queryInterface) {
  const prefix = `NC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-`;
  const [latest] = await queryInterface.sequelize.query(
    `SELECT patient_code FROM patient_profiles WHERE patient_code LIKE :prefix ORDER BY patient_code DESC LIMIT 1`,
    { replacements: { prefix: `${prefix}%` } }
  );
  let seq = 1;
  if (latest.length) {
    const parts = latest[0].patient_code.split("-");
    const n = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

module.exports = {
  async up(queryInterface) {
    assertDemoSeedAllowed("professional-test-users");
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // —— Permission groups ——
    for (const group of TEST_PERMISSION_GROUPS) {
      await ensurePermissionGroup(queryInterface, group, now);
    }

    const [deptRows] = await queryInterface.sequelize.query(
      `SELECT department_id, code FROM departments WHERE status = 'active'`
    );
    const deptIdByCode = Object.fromEntries(deptRows.map((d) => [d.code, d.department_id]));

    const [titleRows] = await queryInterface.sequelize.query(
      `SELECT title_id, code FROM user_titles WHERE status = 'active'`
    );
    const titleIdByCode = Object.fromEntries(titleRows.map((t) => [t.code, t.title_id]));

    // —— Internal staff (permission-group only, no roles) ——
    for (const staff of INTERNAL_TEST_STAFF) {
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
            metadata: JSON.stringify({ demo_seed: "professional_test_users" }),
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      await assignUserToGroup(queryInterface, userId, staff.permission_group_id, now);

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

    // —— Patients ——
    for (const patient of TEST_PATIENTS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE email = :email LIMIT 1`,
        { replacements: { email: patient.email } }
      );
      if (existing.length) continue;

      const userId = patient.user_id;
      const profileId = uuidv4();
      const patientCode = await generatePatientCode(queryInterface);
      const codes = assignPatientCodes(patientCode, userId);

      await queryInterface.bulkInsert("users", [
        {
          user_id: userId,
          full_name: patient.full_name,
          email: patient.email,
          password: passwordHash,
          phone_number: patient.phone_number,
          account_type: "PATIENT",
          is_active: true,
          is_first_logged_in: false,
          created_at: now,
          updated_at: now,
        },
      ]);

      await queryInterface.bulkInsert("patient_profiles", [
        {
          patient_profile_id: profileId,
          user_id: userId,
          patient_code: patientCode,
          qr_code: codes.qr_code,
          barcode: codes.barcode,
          date_of_birth: patient.date_of_birth || null,
          gender: patient.gender || null,
          patient_status: "active",
          registered_by: ADMIN_USER_ID,
          registered_at: now,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    // —— Pharmacies ——
    for (const pharmacy of TEST_PHARMACIES) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT pharmacy_id FROM pharmacies
         WHERE pharmacy_id = :pharmacy_id OR pharmacy_code = :pharmacy_code LIMIT 1`,
        {
          replacements: {
            pharmacy_id: pharmacy.pharmacy_id,
            pharmacy_code: pharmacy.pharmacy_code,
          },
        }
      );
      if (existing.length) continue;

      await queryInterface.bulkInsert("pharmacies", [
        {
          pharmacy_id: pharmacy.pharmacy_id,
          pharmacy_name: pharmacy.pharmacy_name,
          pharmacy_code: pharmacy.pharmacy_code,
          license_number: pharmacy.license_number,
          phone: pharmacy.phone,
          email: pharmacy.email,
          address: pharmacy.address,
          city: pharmacy.city,
          region: pharmacy.region,
          country: pharmacy.country,
          contact_person: pharmacy.contact_person,
          status: "active",
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    // —— Pharmacy portal users ——
    for (const phUser of TEST_PHARMACY_USERS) {
      const [existingUser] = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE email = :email LIMIT 1`,
        { replacements: { email: phUser.email } }
      );

      let userId = existingUser[0]?.user_id;
      if (!userId) {
        userId = phUser.user_id;
        await queryInterface.bulkInsert("users", [
          {
            user_id: userId,
            full_name: phUser.full_name,
            email: phUser.email,
            password: passwordHash,
            phone_number: phUser.phone_number,
            is_first_logged_in: false,
            is_active: true,
            account_type: "PHARMACY",
            created_at: now,
            updated_at: now,
          },
        ]);
      }

      const [existingProfile] = await queryInterface.sequelize.query(
        `SELECT pharmacy_user_profile_id FROM pharmacy_user_profiles WHERE user_id = :userId LIMIT 1`,
        { replacements: { userId } }
      );
      if (!existingProfile.length) {
        await queryInterface.bulkInsert("pharmacy_user_profiles", [
          {
            pharmacy_user_profile_id: uuidv4(),
            user_id: userId,
            pharmacy_id: phUser.pharmacy_id,
            portal_role: phUser.portal_role,
            is_active: true,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    console.log(
      "[test-users-seed] Seeded professional test users.",
      `Login password for all @test.novacure accounts: ${DEMO_PASSWORD}`
    );
  },

  async down(queryInterface, Sequelize) {
    const internalEmails = INTERNAL_TEST_STAFF.map((s) => s.email);
    const patientEmails = TEST_PATIENTS.map((p) => p.email);
    const pharmacyUserEmails = TEST_PHARMACY_USERS.map((p) => p.email);
    const allEmails = [...internalEmails, ...patientEmails, ...pharmacyUserEmails];

    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id, account_type FROM users WHERE email IN (:emails)`,
      { replacements: { emails: allEmails } }
    );

    const internalIds = users.filter((u) => u.account_type === "INTERNAL").map((u) => u.user_id);
    const patientIds = users.filter((u) => u.account_type === "PATIENT").map((u) => u.user_id);
    const pharmacyUserIds = users
      .filter((u) => u.account_type === "PHARMACY")
      .map((u) => u.user_id);

    if (internalIds.length) {
      await queryInterface.bulkDelete("diagnosis_form_configs", {
        assigned_staff_id: { [Sequelize.Op.in]: internalIds },
      });
      await queryInterface.bulkDelete("user_permission_groups", {
        user_id: { [Sequelize.Op.in]: internalIds },
      });
      await queryInterface.bulkDelete("internal_user_profiles", {
        user_id: { [Sequelize.Op.in]: internalIds },
      });
      await queryInterface.bulkDelete("users", {
        user_id: { [Sequelize.Op.in]: internalIds },
      });
    }

    if (patientIds.length) {
      await queryInterface.bulkDelete("patient_profiles", { user_id: patientIds });
      await queryInterface.bulkDelete("users", { user_id: patientIds });
    }

    if (pharmacyUserIds.length) {
      await queryInterface.bulkDelete("pharmacy_user_profiles", {
        user_id: pharmacyUserIds,
      });
      await queryInterface.bulkDelete("users", { user_id: pharmacyUserIds });
    }

    const groupIds = TEST_PERMISSION_GROUPS.map((g) => g.permission_group_id);
    await queryInterface.bulkDelete("permission_group_permissions", {
      permission_group_id: { [Sequelize.Op.in]: groupIds },
    });
    await queryInterface.bulkDelete("permission_groups", {
      permission_group_id: { [Sequelize.Op.in]: groupIds },
    });

    const pharmacyIds = TEST_PHARMACIES.map((p) => p.pharmacy_id);
    await queryInterface.bulkDelete("pharmacies", {
      pharmacy_id: { [Sequelize.Op.in]: pharmacyIds },
    });
  },
};
