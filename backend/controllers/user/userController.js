const {
  User,
  Role,
  UserRoles,
  sequelize,
  GovernmentStructure,
  InternalStructure,
  Region,
  RegionalStructure,
  PermissionGroup,
  Company,
  CompanyStructure,
  PurchasingCenter,
} = require("../../models");
const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const { generateRandomPassword } = require("../../utils/password");
const { sendEmail } = require("../../utils/sendEmail");
const { normalizeEmail } = require("../../utils/emailUtils");
const logger = require("../../utils/logger");
const {
  AUDIT_MODULES,
  getClientIp,
  recordSystemAuditLog,
} = require("../../services/auditLogService");
const {
  isSuperAdminActor,
  isRegionalActor,
  isCompanyActor,
  isPurchasingCenterActor,
  resolveManageableStructureId,
  resolveUserGovernmentStructureFilter,
  assertRoleAssignable,
  assertRegionalRoleAssignable,
  assertCompanyRoleAssignable,
  assertPurchasingCenterRoleAssignable,
  assertUserInStructure,
  assertUserManageable,
  assertRegionAccessible,
  assertCompanyAccessible,
  assertPurchasingCenterAccessible,
  assertPurchasingCenterUserManageable,
  assertFederalAccessible,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

async function loadGovernmentStructureIndex() {
  return GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
  });
}

async function validateRoleAssignments(role_ids, structureId, req, transaction, domain = "federal") {
  if (!role_ids?.length) {
    return;
  }

  const roles = await Role.findAll({
    where: { role_id: role_ids, is_active: true },
    transaction,
  });

  if (roles.length !== role_ids.length) {
    const error = new Error("One or more provided role IDs are invalid.");
    error.status = 400;
    throw error;
  }

  for (const role of roles) {
    if (domain === "regional") {
      assertRegionalRoleAssignable(role, req);
    } else if (domain === "company") {
      assertCompanyRoleAssignable(role, req);
    } else if (domain === "purchasing_center") {
      assertPurchasingCenterRoleAssignable(role, req);
    } else {
      assertRoleAssignable(role, structureId, req);
    }
  }
}

const userDetailIncludes = [
  {
    model: Role,
    as: "roles",
    through: { attributes: [] },
  },
  {
    model: GovernmentStructure,
    as: "governmentStructure",
  },
  {
    model: InternalStructure,
    as: "internalStructure",
  },
  {
    model: Region,
    as: "region",
  },
  {
    model: RegionalStructure,
    as: "regionalStructure",
  },
  {
    model: Company,
    as: "company",
  },
  {
    model: CompanyStructure,
    as: "companyStructure",
  },
  {
    model: PurchasingCenter,
    as: "purchasingCenter",
  },
  {
    model: PermissionGroup,
    as: "permissionGroups",
    through: { attributes: [] },
  },
];


const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      full_name,
      role_ids,
      phone_number,
      government_structure_id,
      internal_structure_id,
      region_id,
      regional_structure_id,
      company_id,
      company_structure_id,
      purchasing_center_id,
    } = req.body;
    const email = normalizeEmail(req.body.email);

    const hasFederal = Boolean(government_structure_id || internal_structure_id);
    const hasRegional = Boolean(region_id || regional_structure_id);
    const hasCompany = Boolean(company_id || company_structure_id);
    const hasPurchasingCenter = Boolean(purchasing_center_id);

    // Enforce mutual exclusivity of domain assignments (at most 1 domain)
    const domainCount = [hasFederal, hasRegional, hasCompany, hasPurchasingCenter].filter(Boolean).length;
    if (domainCount > 1) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "An account cannot be assigned to multiple domains (federal, regional, company, purchasing center) simultaneously.",
      });
    }

    // Purchasing center user cannot create accounts outside their purchasing center
    if (req.user?.is_purchasing_center && (hasRegional || hasFederal || hasCompany)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Purchasing center users cannot create accounts outside their purchasing center domain.",
      });
    }

    // Company user cannot create accounts outside their company
    if (req.user?.is_company && (hasRegional || hasFederal || hasPurchasingCenter)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Company users cannot create accounts outside their company domain.",
      });
    }

    // Regional user cannot create accounts outside their region
    if (req.user?.is_regional && (hasCompany || hasFederal || hasPurchasingCenter)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Regional users cannot create company, purchasing center, or federal accounts.",
      });
    }

    // Company account creation path
    if (hasCompany || req.user?.is_company) {
      let targetCompanyId = company_id;
      if (req.user?.is_company) {
        if (company_id && company_id !== req.user.company_id) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Company users cannot create accounts for other companies.",
          });
        }
        targetCompanyId = req.user.company_id;

        const actorPerms = (req.user.permissions || []).map((p) => String(p).toLowerCase());
        const hasCompanyCreatePerm =
          actorPerms.includes("company_users:create") ||
          actorPerms.includes("company_users:manage") ||
          isSuperAdminActor(req);

        if (!hasCompanyCreatePerm) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Access denied: missing company user creation permission.",
          });
        }
      } else {
        const actorPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
        const hasFederalCompanyCreate =
          actorPerms.includes("company_users:create") ||
          actorPerms.includes("company_users:manage") ||
          actorPerms.includes("companies:manage") ||
          isSuperAdminActor(req);

        if (!hasFederalCompanyCreate) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Access denied: federal account lacks company user creation permission.",
          });
        }
      }

      if (!targetCompanyId) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "company_id is required for company accounts.",
        });
      }

      const targetCompany = await Company.findByPk(targetCompanyId, { transaction: t });
      if (!targetCompany) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Target company not found.",
        });
      }
      if (!targetCompany.is_active) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot create accounts in a deactivated company.",
        });
      }

      if (company_structure_id) {
        const compStruct = await CompanyStructure.findByPk(company_structure_id, { transaction: t });
        if (!compStruct) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Target company department not found.",
          });
        }
        if (compStruct.company_id !== targetCompanyId) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Company department must belong to the user's assigned company.",
          });
        }
        if (!compStruct.is_active) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Cannot assign user to an inactive company department.",
          });
        }
      }

      const existingUser = await User.findOne({
        where: { email: { [Op.iLike]: email } },
        transaction: t,
      });
      if (existingUser) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "User already exists." });
      }

      const password = "12345678";
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create(
        {
          user_id: uuidv4(),
          full_name,
          email,
          password: hashedPassword,
          phone_number,
          is_first_logged_in: true,
          is_active: true,
          government_structure_id: null,
          internal_structure_id: null,
          region_id: null,
          regional_structure_id: null,
          company_id: targetCompanyId,
          company_structure_id: company_structure_id || null,
          purchasing_center_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction: t }
      );

      if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
        try {
          await validateRoleAssignments(role_ids, null, req, t, "company");
        } catch (error) {
          await t.rollback();
          return sendScopeError(res, error);
        }

        const roleAssignments = role_ids.map((rid) => ({
          user_role_id: uuidv4(),
          user_id: user.user_id,
          role_id: rid,
          assigned_by: req.user?.user_id || null,
          assigned_at: new Date(),
          is_active: true,
        }));
        await UserRoles.bulkCreate(roleAssignments, { transaction: t });
      }

      await recordSystemAuditLog(
        {
          module: AUDIT_MODULES.USERS,
          action: "create",
          entityId: user.user_id,
          entityLabel: user.full_name,
          newValues: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            company_id: user.company_id,
            company_structure_id: user.company_structure_id,
            is_active: user.is_active,
          },
          changedBy: req.user.user_id,
          ipAddress: getClientIp(req),
        },
        t
      );

      await t.commit();

      try {
        await sendEmail(
          email,
          `Welcome to ${process.env.APP_NAME || "Ministry of Mines"}!`,
          `Dear ${full_name},\nYour company account for ${targetCompany.name} has been created.\nEmail: ${email}\nTemporary Password: ${password}\nPlease change your password after first login.`
        );
      } catch (emailError) {
        logger.warn(`Company user created, but email notification failed: ${emailError.message}`);
      }

      const createdWithIncludes = await User.findByPk(user.user_id, {
        include: userDetailIncludes,
      });

      return res.status(201).json({
        success: true,
        message: "Company user created successfully.",
        data: createdWithIncludes || user,
      });
    }

    // Regional account creation path
    if (hasRegional || req.user?.is_regional) {
      let targetRegionId = region_id;
      if (req.user?.is_regional) {
        if (region_id && region_id !== req.user.region_id) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Regional users cannot create accounts for other regions.",
          });
        }
        targetRegionId = req.user.region_id;

        const hasRegionalCreatePerm =
          req.user.permissions?.includes("regional_users:create") ||
          req.user.permissions?.includes("regional_users:manage") ||
          isSuperAdminActor(req);

        if (!hasRegionalCreatePerm) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Access denied: missing regional user creation permission.",
          });
        }
      } else {
        const actorPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
        const hasFederalRegionalCreate =
          actorPerms.includes("regional_users:create") ||
          actorPerms.includes("regional_users:manage") ||
          actorPerms.includes("users:create") ||
          actorPerms.includes("users:manage") ||
          actorPerms.includes("regions:manage") ||
          isSuperAdminActor(req);

        if (!hasFederalRegionalCreate) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Access denied: federal account lacks regional user creation permission.",
          });
        }
      }

      if (!targetRegionId) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "region_id is required for regional accounts.",
        });
      }

      const targetRegion = await Region.findByPk(targetRegionId, { transaction: t });
      if (!targetRegion) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Target region not found.",
        });
      }
      if (!targetRegion.is_active) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot create accounts in a deactivated region.",
        });
      }

      if (regional_structure_id) {
        const regStruct = await RegionalStructure.findByPk(regional_structure_id, { transaction: t });
        if (!regStruct) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Target regional department not found.",
          });
        }
        if (regStruct.region_id !== targetRegionId) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Regional department must belong to the user's assigned region.",
          });
        }
        if (!regStruct.is_active) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Cannot assign user to an inactive regional department.",
          });
        }
      }

      const existingUser = await User.findOne({
        where: { email: { [Op.iLike]: email } },
        transaction: t,
      });
      if (existingUser) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "User already exists." });
      }

      // const password = generateRandomPassword();
      const password = "12345678";
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create(
        {
          user_id: uuidv4(),
          full_name,
          email,
          password: hashedPassword,
          phone_number,
          is_first_logged_in: true,
          is_active: true,
          government_structure_id: null,
          internal_structure_id: null,
          region_id: targetRegionId,
          regional_structure_id: regional_structure_id || null,
          company_id: null,
          company_structure_id: null,
          purchasing_center_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction: t }
      );

      if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
        try {
          await validateRoleAssignments(role_ids, null, req, t, "regional");
        } catch (error) {
          await t.rollback();
          return sendScopeError(res, error);
        }

        const roleAssignments = role_ids.map((rid) => ({
          user_role_id: uuidv4(),
          user_id: user.user_id,
          role_id: rid,
          assigned_by: req.user?.user_id || null,
          assigned_at: new Date(),
          is_active: true,
        }));
        await UserRoles.bulkCreate(roleAssignments, { transaction: t });
      }

      await recordSystemAuditLog(
        {
          module: AUDIT_MODULES.USERS,
          action: "create",
          entityId: user.user_id,
          entityLabel: user.full_name,
          newValues: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            region_id: user.region_id,
            regional_structure_id: user.regional_structure_id,
            is_active: user.is_active,
          },
          changedBy: req.user.user_id,
          ipAddress: getClientIp(req),
        },
        t
      );

      await t.commit();

      try {
        await sendEmail(
          email,
          `Welcome to ${process.env.APP_NAME || "Ministry of Mines"}!`,
          `Dear ${full_name},\nYour regional account for ${targetRegion.name} has been created.\nEmail: ${email}\nTemporary Password: ${password}\nPlease change your password after first login.`
        );
      } catch (emailError) {
        logger.warn(`Regional user created, but email notification failed: ${emailError.message}`);
      }

      const createdWithIncludes = await User.findByPk(user.user_id, {
        include: userDetailIncludes,
      });

      return res.status(201).json({
        success: true,
        message: "Regional user created successfully.",
        data: createdWithIncludes || user,
      });
    }

    // Purchasing Center account creation path
    if (hasPurchasingCenter || req.user?.is_purchasing_center) {
      if (
        government_structure_id ||
        internal_structure_id ||
        regional_structure_id ||
        company_structure_id
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Purchasing center accounts cannot be assigned to departments or organizational structures.",
        });
      }

      let targetPurchasingCenterId = purchasing_center_id;
      if (req.user?.is_purchasing_center) {
        if (purchasing_center_id && purchasing_center_id !== req.user.purchasing_center_id) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Purchasing center users cannot create accounts for other purchasing centers.",
          });
        }
        targetPurchasingCenterId = req.user.purchasing_center_id;

        const actorPerms = (req.user.permissions || []).map((p) => String(p).toLowerCase());
        const hasPCCreatePerm =
          actorPerms.includes("purchasing_center_users:create") ||
          actorPerms.includes("purchasing_center_users:manage") ||
          actorPerms.includes("purchasing_centers:manage") ||
          isSuperAdminActor(req);

        if (!hasPCCreatePerm) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Access denied: missing purchasing center user creation permission.",
          });
        }
      } else {
        const actorPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
        const hasFederalPCCreate =
          actorPerms.includes("purchasing_center_users:create") ||
          actorPerms.includes("purchasing_center_users:manage") ||
          actorPerms.includes("purchasing_centers:manage") ||
          actorPerms.includes("users:create") ||
          actorPerms.includes("users:manage") ||
          isSuperAdminActor(req);

        if (!hasFederalPCCreate) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: "Access denied: federal account lacks purchasing center user creation permission.",
          });
        }
      }

      if (!targetPurchasingCenterId) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "purchasing_center_id is required for purchasing center accounts.",
        });
      }

      const targetPC = await PurchasingCenter.findByPk(targetPurchasingCenterId, { transaction: t });
      if (!targetPC) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Target purchasing center not found.",
        });
      }
      if (!targetPC.is_active) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot create accounts in a deactivated purchasing center.",
        });
      }

      const existingUser = await User.findOne({
        where: { email: { [Op.iLike]: email } },
        transaction: t,
      });
      if (existingUser) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "User already exists." });
      }

      const password = "12345678";
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create(
        {
          user_id: uuidv4(),
          full_name,
          email,
          password: hashedPassword,
          phone_number,
          is_first_logged_in: true,
          is_active: true,
          government_structure_id: null,
          internal_structure_id: null,
          region_id: null,
          regional_structure_id: null,
          company_id: null,
          company_structure_id: null,
          purchasing_center_id: targetPurchasingCenterId,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction: t }
      );

      if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
        try {
          await validateRoleAssignments(role_ids, null, req, t, "purchasing_center");
        } catch (error) {
          await t.rollback();
          return sendScopeError(res, error);
        }

        const roleAssignments = role_ids.map((rid) => ({
          user_role_id: uuidv4(),
          user_id: user.user_id,
          role_id: rid,
          assigned_by: req.user?.user_id || null,
          assigned_at: new Date(),
          is_active: true,
        }));
        await UserRoles.bulkCreate(roleAssignments, { transaction: t });
      }

      await recordSystemAuditLog(
        {
          module: AUDIT_MODULES.USERS,
          action: "create",
          entityId: user.user_id,
          entityLabel: user.full_name,
          newValues: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            purchasing_center_id: user.purchasing_center_id,
            is_active: user.is_active,
          },
          changedBy: req.user.user_id,
          ipAddress: getClientIp(req),
        },
        t
      );

      await t.commit();

      try {
        await sendEmail(
          email,
          `Welcome to ${process.env.APP_NAME || "Ministry of Mines"}!`,
          `Dear ${full_name},\nYour account for ${targetPC.name} has been created.\nEmail: ${email}\nTemporary Password: ${password}\nPlease change your password after first login.`
        );
      } catch (emailError) {
        logger.warn(`Purchasing center user created, but email notification failed: ${emailError.message}`);
      }

      const createdWithIncludes = await User.findByPk(user.user_id, {
        include: userDetailIncludes,
      });

      return res.status(201).json({
        success: true,
        message: "Purchasing center user created successfully.",
        data: createdWithIncludes || user,
      });
    }

    // Federal account creation path:
    if (req.user?.is_regional || req.user?.is_company || req.user?.is_purchasing_center) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Regional, company, or purchasing center users cannot create federal accounts.",
      });
    }

    let structureId;
    try {
      const structureIndex = await loadGovernmentStructureIndex();
      structureId = resolveManageableStructureId(
        req,
        government_structure_id,
        structureIndex
      );
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    if (!structureId && !isSuperAdminActor(req)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "government_structure_id is required.",
      });
    }

    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      try {
        await validateRoleAssignments(role_ids, structureId, req, t);
      } catch (error) {
        await t.rollback();
        return sendScopeError(res, error);
      }
    }

    // ====== Check existing email ======
    const existingUser = await User.findOne({
      where: { email: { [Op.iLike]: email } },
      transaction: t,
    });
    if (existingUser) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "User already exists." });
    }

    const resolvedStructureId = structureId || government_structure_id || null;
    const password = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // ====== Create User ======
    const user = await User.create(
      {
        user_id: uuidv4(),
        full_name,
        email,
        password: hashedPassword,
        phone_number,
        is_first_logged_in: true,
        is_active: true,
        government_structure_id: resolvedStructureId,
        internal_structure_id,
        region_id: null,
        regional_structure_id: null,
        company_id: null,
        company_structure_id: null,
        purchasing_center_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    // =======================================================
    // 🔵 MULTIPLE ROLE ASSIGNMENT
    // =======================================================
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const roleAssignments = role_ids.map((rid) => ({
        user_role_id: uuidv4(),
        user_id: user.user_id,
        role_id: rid,
        assigned_by: req.user?.user_id || null,
        assigned_at: new Date(),
        is_active: true,
      }));

      await UserRoles.bulkCreate(roleAssignments, { transaction: t });
    }

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.USERS,
        action: "create",
        entityId: user.user_id,
        entityLabel: user.full_name,
        newValues: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          is_active: user.is_active,
        },
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    // ====== Send welcome email ======
    try {
      await sendEmail(
        email,
        `Welcome to ${process.env.APP_NAME || "Ministry of Mines"}!`,
        `
        Dear ${full_name},
        Your account has been successfully created.
        Email: ${email}
        Temporary Password: ${password}
        Please change your password after first login.
      `
      );
    } catch (emailError) {
      logger.warn(`Federal user created, but email notification failed: ${emailError.message}`);
    }

    return res.status(201).json({
      success: true,
      message: "User registered globally (no roles assigned yet)",
      data: user,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error creating user:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =============== Update user ===============
const updateUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: user_id } = req.params;
    const {
      full_name,
      phone_number,
      is_active,
      is_first_logged_in,
      role_ids,
      government_structure_id,
      internal_structure_id,
      region_id,
      regional_structure_id,
      company_id,
      company_structure_id,
      purchasing_center_id,
      profile_image,
    } = req.body;
    const email = req.body.email != null ? normalizeEmail(req.body.email) : undefined;

    // ====== Find user ======
    const user = await User.findByPk(user_id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const structureIndex = await loadGovernmentStructureIndex();
      assertUserManageable(user, req, structureIndex);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    let targetStructureId = user.government_structure_id;
    let targetInternalStructureId = user.internal_structure_id;
    let targetRegionalStructureId = user.regional_structure_id;
    let targetCompanyStructureId = user.company_structure_id;

    // Strict account-domain boundary check:
    if (user.company_id) {
      // User is in Company domain
      if (
        government_structure_id ||
        internal_structure_id ||
        region_id ||
        regional_structure_id ||
        purchasing_center_id
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot assign federal, regional, or purchasing center structures to a company account. Accounts cannot cross domains.",
        });
      }

      if (company_id && company_id !== user.company_id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot transfer a user across companies. Accounts must remain strictly within their assigned company.",
        });
      }

      if (company_structure_id !== undefined) {
        if (company_structure_id) {
          const compStruct = await CompanyStructure.findByPk(company_structure_id, {
            transaction: t,
          });
          if (!compStruct || compStruct.company_id !== user.company_id) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message:
                "Target company department does not exist or belongs to another company.",
            });
          }
          if (!compStruct.is_active) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message: "Cannot assign user to an inactive company department.",
            });
          }
          targetCompanyStructureId = company_structure_id;
        } else {
          targetCompanyStructureId = null;
        }
      }
    } else if (user.region_id) {
      // User is in Regional domain
      if (
        government_structure_id ||
        internal_structure_id ||
        company_id ||
        company_structure_id ||
        purchasing_center_id
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot assign federal, company, or purchasing center structures to a regional account. Accounts cannot cross domains.",
        });
      }

      if (region_id && region_id !== user.region_id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot transfer a user across regions. Accounts must remain strictly within their assigned region.",
        });
      }

      if (regional_structure_id !== undefined) {
        if (regional_structure_id) {
          const regStruct = await RegionalStructure.findByPk(regional_structure_id, {
            transaction: t,
          });
          if (!regStruct || regStruct.region_id !== user.region_id) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message:
                "Target regional department does not exist or belongs to another region.",
            });
          }
          if (!regStruct.is_active) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message: "Cannot assign user to an inactive regional department.",
            });
          }
          targetRegionalStructureId = regional_structure_id;
        } else {
          targetRegionalStructureId = null;
        }
      }
    } else if (user.purchasing_center_id) {
      // User is in Purchasing Center domain
      if (
        government_structure_id ||
        internal_structure_id ||
        region_id ||
        regional_structure_id ||
        company_id ||
        company_structure_id
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot assign federal, regional, or company structures to a purchasing center account. Accounts cannot cross domains or have departments.",
        });
      }

      if (purchasing_center_id && purchasing_center_id !== user.purchasing_center_id) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot transfer a user across purchasing centers. Accounts must remain strictly within their assigned purchasing center.",
        });
      }
    } else {
      // User is in Federal domain
      if (
        region_id ||
        regional_structure_id ||
        company_id ||
        company_structure_id ||
        purchasing_center_id
      ) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message:
            "Cannot assign regional, company, or purchasing center structures to a federal account. Accounts cannot cross domains.",
        });
      }

      if (government_structure_id !== undefined) {
        try {
          const structureIndex = await loadGovernmentStructureIndex();
          targetStructureId = resolveManageableStructureId(
            req,
            government_structure_id,
            structureIndex
          );
        } catch (error) {
          await t.rollback();
          return sendScopeError(res, error);
        }
      }

      if (internal_structure_id !== undefined) {
        targetInternalStructureId = internal_structure_id;
      }
    }

    const previousValues = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      is_active: user.is_active,
      is_first_logged_in: user.is_first_logged_in,
      government_structure_id: user.government_structure_id,
      internal_structure_id: user.internal_structure_id,
      region_id: user.region_id,
      regional_structure_id: user.regional_structure_id,
      company_id: user.company_id,
      company_structure_id: user.company_structure_id,
      purchasing_center_id: user.purchasing_center_id,
    };

    // ====== Check for email duplication ======
    if (email && email !== user.email.toLowerCase()) {
      const existingEmail = await User.findOne({
        where: {
          email: { [Op.iLike]: email },
          user_id: { [Op.ne]: user.user_id },
        },
        transaction: t,
      });
      if (existingEmail) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another user.",
        });
      }
    }

    // ====== Update user ======
    await user.update(
      {
        full_name: full_name ?? user.full_name,
        email: email ?? user.email,
        phone_number: phone_number ?? user.phone_number,
        is_active: is_active ?? user.is_active,
        is_first_logged_in:
          is_first_logged_in !== undefined ? is_first_logged_in : user.is_first_logged_in,
        government_structure_id: targetStructureId,
        internal_structure_id: targetInternalStructureId,
        regional_structure_id: targetRegionalStructureId,
        company_structure_id: targetCompanyStructureId,
        profile_image: profile_image !== undefined ? profile_image : user.profile_image,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    // ====== Update roles if provided ======
    if (role_ids && Array.isArray(role_ids)) {
      const targetDomain = user.purchasing_center_id
        ? "purchasing_center"
        : user.company_id
        ? "company"
        : user.region_id
        ? "regional"
        : "federal";
      try {
        await validateRoleAssignments(
          role_ids,
          targetStructureId,
          req,
          t,
          targetDomain
        );
      } catch (error) {
        await t.rollback();
        return sendScopeError(res, error);
      }

      await UserRoles.destroy({
        where: { user_id },
        transaction: t,
      });

      const roleAssignments = role_ids.map((rid) => ({
        user_role_id: uuidv4(),
        user_id,
        role_id: rid,
        assigned_by: req.user?.user_id || null,
        assigned_at: new Date(),
        is_active: true,
      }));
      await UserRoles.bulkCreate(roleAssignments, { transaction: t });
    }

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.USERS,
        action: "update",
        entityId: user.user_id,
        entityLabel: user.full_name,
        previousValues,
        newValues: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          is_active: user.is_active,
          is_first_logged_in: user.is_first_logged_in,
          government_structure_id: user.government_structure_id,
          internal_structure_id: user.internal_structure_id,
          region_id: user.region_id,
          regional_structure_id: user.regional_structure_id,
          company_id: user.company_id,
          company_structure_id: user.company_structure_id,
          role_ids: role_ids ?? undefined,
        },
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    const updatedWithIncludes = await User.findByPk(user.user_id, {
      include: userDetailIncludes,
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: updatedWithIncludes || user,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error updating user:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============Get all users=====================
const getUsers = async (req, res) => {
  try {
    const {
      is_active,
      search,
      government_structure_id,
      internal_structure_id,
      region_id,
      regional_structure_id,
      company_id,
      company_structure_id,
      purchasing_center_id,
      domain,
    } = req.query;

    const whereClause = {};

    if (is_active !== undefined) whereClause.is_active = is_active === "true";

    // Domain, region, company, and purchasing center filtering
    if (req.user?.is_purchasing_center) {
      if (purchasing_center_id && purchasing_center_id !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot access users of another purchasing center.",
        });
      }

      const actorPerms = (req.user.permissions || []).map((p) => String(p).toLowerCase());
      const hasPCUserRead =
        actorPerms.includes("purchasing_center_users:read") ||
        actorPerms.includes("purchasing_center_users:manage") ||
        actorPerms.includes("purchasing_centers:manage") ||
        isSuperAdminActor(req);

      if (!hasPCUserRead) {
        return res.status(403).json({
          success: false,
          message: "Access denied: missing purchasing center user read permission.",
        });
      }

      whereClause.purchasing_center_id = req.user.purchasing_center_id;
    } else if (req.user?.is_company) {
      if (company_id && company_id !== req.user.company_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot access users of another company.",
        });
      }

      const actorPerms = (req.user.permissions || []).map((p) => String(p).toLowerCase());
      const hasCompanyUserRead =
        actorPerms.includes("company_users:read") ||
        actorPerms.includes("company_users:manage") ||
        isSuperAdminActor(req);

      if (!hasCompanyUserRead) {
        return res.status(403).json({
          success: false,
          message: "Access denied: missing company user read permission.",
        });
      }

      whereClause.company_id = req.user.company_id;
      if (company_structure_id || internal_structure_id) {
        whereClause.company_structure_id = company_structure_id || internal_structure_id;
      }
    } else if (req.user?.is_regional) {
      if (region_id && region_id !== req.user.region_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot access users of another region.",
        });
      }
      // Regional users are strictly isolated to their assigned region
      const hasRegionalUserRead =
        req.user.permissions?.includes("regional_users:read") ||
        req.user.permissions?.includes("regional_users:manage") ||
        isSuperAdminActor(req);

      if (!hasRegionalUserRead) {
        return res.status(403).json({
          success: false,
          message: "Access denied: missing regional user read permission.",
        });
      }

      whereClause.region_id = req.user.region_id;
      if (regional_structure_id || internal_structure_id) {
        whereClause.regional_structure_id = regional_structure_id || internal_structure_id;
      }
    } else {
      // Federal caller
      const isTargetingPC = Boolean(purchasing_center_id || domain === "purchasing_center");
      const isTargetingCompany = Boolean(company_id || domain === "company");
      const isTargetingRegional = Boolean(region_id || domain === "regional");

      if (isTargetingPC) {
        const actorPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
        const hasFederalPCUserRead =
          actorPerms.includes("purchasing_center_users:read") ||
          actorPerms.includes("purchasing_center_users:manage") ||
          actorPerms.includes("purchasing_centers:read") ||
          actorPerms.includes("purchasing_centers:manage") ||
          isSuperAdminActor(req);

        if (!hasFederalPCUserRead) {
          return res.status(403).json({
            success: false,
            message: "Access denied: federal account lacks purchasing center user management permission.",
          });
        }

        if (purchasing_center_id) {
          whereClause.purchasing_center_id = purchasing_center_id;
        } else {
          whereClause.purchasing_center_id = { [Op.ne]: null };
        }
        whereClause.company_id = null;
        whereClause.region_id = null;
        whereClause.government_structure_id = null;
      } else if (isTargetingCompany) {
        const actorPerms = (req.user?.permissions || []).map((p) => String(p).toLowerCase());
        const hasFederalCompanyUserRead =
          actorPerms.includes("company_users:read") ||
          actorPerms.includes("company_users:manage") ||
          actorPerms.includes("companies:read") ||
          actorPerms.includes("companies:manage") ||
          isSuperAdminActor(req);

        if (!hasFederalCompanyUserRead) {
          return res.status(403).json({
            success: false,
            message: "Access denied: federal account lacks company user management permission.",
          });
        }

        if (company_id) {
          whereClause.company_id = company_id;
        } else {
          whereClause.company_id = { [Op.ne]: null };
        }
        whereClause.region_id = null;
        whereClause.government_structure_id = null;
        whereClause.purchasing_center_id = null;

        if (company_structure_id || internal_structure_id) {
          whereClause.company_structure_id = company_structure_id || internal_structure_id;
        }
      } else if (isTargetingRegional) {
        const hasFederalRegionalUserRead =
          req.user.permissions?.includes("regional_users:read") ||
          req.user.permissions?.includes("regional_users:manage") ||
          req.user.permissions?.includes("regions:read") ||
          req.user.permissions?.includes("regions:manage") ||
          isSuperAdminActor(req);

        if (!hasFederalRegionalUserRead) {
          return res.status(403).json({
            success: false,
            message: "Access denied: federal account lacks regional user management permission.",
          });
        }

        if (region_id) {
          whereClause.region_id = region_id;
        } else {
          whereClause.region_id = { [Op.ne]: null };
        }
        whereClause.company_id = null;
        whereClause.government_structure_id = null;
        whereClause.purchasing_center_id = null;

        if (regional_structure_id || internal_structure_id) {
          whereClause.regional_structure_id = regional_structure_id || internal_structure_id;
        }
      } else {
        whereClause.region_id = null;
        whereClause.company_id = null;
        whereClause.purchasing_center_id = null;

        if (internal_structure_id) {
          whereClause.internal_structure_id = internal_structure_id;
        }

        const structureIndex = await loadGovernmentStructureIndex();
        let structureIds;
        try {
          structureIds = resolveUserGovernmentStructureFilter(
            req,
            government_structure_id,
            structureIndex
          );
        } catch (error) {
          return sendScopeError(res, error);
        }

        if (structureIds) {
          whereClause.government_structure_id = { [Op.in]: structureIds };
        }
      }
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // ====== Fetch users with associations ======
    const users = await User.findAll({
      where: whereClause,
      include: userDetailIncludes,
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id: user_id } = req.params;

    // ====== Find user with relations ======
    const user = await User.findByPk(user_id, {
      include: userDetailIncludes,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const structureIndex = await loadGovernmentStructureIndex();
      assertUserManageable(user, req, structureIndex, "read");
    } catch (error) {
      return sendScopeError(res, error);
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format.",
      });
    }

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const structureIndex = await loadGovernmentStructureIndex();
      assertUserManageable(user, req, structureIndex, "delete");
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    // Soft delete (deactivate)
    await user.update(
      { is_active: false, updated_at: new Date() },
      { transaction: t }
    );
    await t.commit();

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully.",
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      message: "Error deactivating user",
      error: error.message,
    });
  }
};
const toggleUserActiveStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { is_active } = req.body; // expect boolean true/false

    if (!isUuid(id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format.",
      });
    }

    if (typeof is_active !== "boolean") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value.",
      });
    }

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const structureIndex = await loadGovernmentStructureIndex();
      assertUserManageable(user, req, structureIndex);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    await user.update(
      { is_active, updated_at: new Date() },
      { transaction: t }
    );
    await t.commit();

    return res.status(200).json({
      success: true,
      message: `User ${is_active ? "activated" : "deactivated"} successfully.`,
      data: { user_id: id, is_active },
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      message: "Error toggling user status",
      error: error.message,
    });
  }
};

const resetUserPassword = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format.",
      });
    }

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const structureIndex = await loadGovernmentStructureIndex();
      assertUserManageable(user, req, structureIndex);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    // const newPassword = generateRandomPassword();
    const newPassword = "12345678";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update(
      {
        password: hashedPassword,
        is_first_logged_in: true,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await recordSystemAuditLog(
      {
        module: AUDIT_MODULES.USERS,
        action: "reset_password",
        entityId: user.user_id,
        entityLabel: user.full_name,
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    try {
      await sendEmail(
        user.email,
        `Password Reset - ${process.env.APP_NAME || "Ministry of Mines"}`,
        `
        Dear ${user.full_name},
        Your password has been reset by an administrator.
        Email: ${user.email}
        New Temporary Password: ${newPassword}
        You will be required to change your password after logging in.
        `
      );
    } catch (emailError) {
      logger.warn(`Password reset successfully, but email notification failed: ${emailError.message}`);
    }

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. The new password has been sent via email.",
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      message: "Error resetting user password",
      error: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const user = await User.findOne({
      where: { user_id: userId },
      include: userDetailIncludes,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.user_id;
    const { full_name, phone_number, profile_image } = req.body;

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "User not found." });
    }

    await user.update(
      {
        full_name: full_name ?? user.full_name,
        phone_number:
          phone_number !== undefined
            ? phone_number || null
            : user.phone_number,
        profile_image:
          profile_image !== undefined ? profile_image || null : user.profile_image,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    const updatedUser = await User.findByPk(userId, {
      include: userDetailIncludes,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error updating profile:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUserDisplayNames = async (req, res) => {
  try {
    const userIds = Array.isArray(req.body?.user_ids) ? req.body.user_ids : [];
    const uniqueIds = [...new Set(userIds.filter((id) => isUuid(id)))].slice(0, 100);

    if (!uniqueIds.length) {
      return res.status(200).json({ success: true, data: {} });
    }

    if (req.user?.is_purchasing_center) {
      const users = await User.findAll({
        where: { user_id: { [Op.in]: uniqueIds }, purchasing_center_id: req.user.purchasing_center_id },
        attributes: ["user_id", "full_name", "email"],
      });
      const data = {};
      for (const u of users) {
        data[u.user_id] = { full_name: u.full_name, email: u.email };
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.user?.is_company) {
      const users = await User.findAll({
        where: { user_id: { [Op.in]: uniqueIds }, company_id: req.user.company_id },
        attributes: ["user_id", "full_name", "email"],
      });
      const data = {};
      for (const u of users) {
        data[u.user_id] = { full_name: u.full_name, email: u.email };
      }
      return res.status(200).json({ success: true, data });
    }

    if (req.user?.is_regional) {
      const users = await User.findAll({
        where: { user_id: { [Op.in]: uniqueIds }, region_id: req.user.region_id },
        attributes: ["user_id", "full_name", "email"],
      });
      const data = {};
      for (const u of users) {
        data[u.user_id] = { full_name: u.full_name, email: u.email };
      }
      return res.status(200).json({ success: true, data });
    }

    const users = await User.findAll({
      where: { user_id: { [Op.in]: uniqueIds } },
      attributes: ["user_id", "full_name", "email", "government_structure_id"],
    });

    const structureIndex = await loadGovernmentStructureIndex();
    let visibleStructureIds;
    try {
      visibleStructureIds = resolveUserGovernmentStructureFilter(
        req,
        null,
        structureIndex
      );
    } catch (error) {
      return sendScopeError(res, error);
    }

    const visibleSet = visibleStructureIds
      ? new Set(visibleStructureIds)
      : null;

    const data = {};
    for (const user of users) {
      if (
        visibleSet &&
        user.government_structure_id &&
        !visibleSet.has(user.government_structure_id)
      ) {
        continue;
      }
      data[user.user_id] = {
        full_name: user.full_name,
        email: user.email,
      };
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error resolving user display names:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve user display names.",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  getUserDisplayNames,
  updateUser,
  deleteUser,
  toggleUserActiveStatus,
  resetUserPassword,
  getProfile,
  updateProfile,
};
