const {
  User,
  Role,
  UserRoles,
  sequelize,
  GovernmentStructure,
  InternalStructure,
  PermissionGroup,
} = require("../../models");
const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const { generateRandomPassword } = require("../../utils/password");
const { sendEmail } = require("../../utils/sendEmail");
const { normalizeEmail } = require("../../utils/emailUtils");
const {
  AUDIT_MODULES,
  getClientIp,
  recordSystemAuditLog,
} = require("../../services/auditLogService");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  resolveUserGovernmentStructureFilter,
  assertRoleAssignable,
  assertUserInStructure,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

async function loadGovernmentStructureIndex() {
  return GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
  });
}

async function validateRoleAssignments(role_ids, structureId, req, transaction) {
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
    assertRoleAssignable(role, structureId, req);
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
    model: PermissionGroup,
    as: "permissionGroups",
    through: { attributes: [] },
  },
];


const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { full_name, role_ids, phone_number, government_structure_id, internal_structure_id } = req.body;
    const email = normalizeEmail(req.body.email);

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
    await sendEmail(
      email,
      `Welcome to ${process.env.APP_NAME}!`,
      `
      Dear ${full_name},
      Your account has been successfully created.
      Email: ${email}
      Temporary Password: ${password}
      Please change your password after first login.
    `
    );

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
  // console.log("update user reached")

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
      profile_image,
    } = req.body;
    const email = req.body.email != null ? normalizeEmail(req.body.email) : undefined;

    // ====== Find user ======
    const user = await User.findByPk(user_id, { transaction: t });
    console.log("user: ", user, "user_idL ", user_id, req.params);
    if (!user) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const structureIndex = await loadGovernmentStructureIndex();
      assertUserInStructure(user, user.government_structure_id, req, structureIndex);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    let targetStructureId = user.government_structure_id;
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
    const previousValues = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      is_active: user.is_active,
      is_first_logged_in: user.is_first_logged_in,
      government_structure_id: user.government_structure_id,
      internal_structure_id: user.internal_structure_id,
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
        government_structure_id: targetStructureId ?? user.government_structure_id,
        internal_structure_id: internal_structure_id ?? user.internal_structure_id,
        profile_image: profile_image !== undefined ? profile_image : user.profile_image,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    // ====== Update roles if provided ======
    if (role_ids && Array.isArray(role_ids)) {
      try {
        await validateRoleAssignments(role_ids, targetStructureId, req, t);
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
          role_ids: role_ids ?? undefined,
        },
        changedBy: req.user.user_id,
        ipAddress: getClientIp(req),
      },
      t
    );

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
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
    } = req.query;

    const whereClause = {};

    if (is_active !== undefined) whereClause.is_active = is_active === "true";
    if (internal_structure_id) whereClause.internal_structure_id = internal_structure_id;

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

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
      ];
    }

    // ====== Fetch users with associations ======
    const users = await User.findAll({
      where: whereClause,
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

    console.log("user_id: ", user_id);

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
      assertUserInStructure(user, user.government_structure_id, req, structureIndex);
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
      assertUserInStructure(user, user.government_structure_id, req, structureIndex);
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
      assertUserInStructure(user, user.government_structure_id, req, structureIndex);
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
      assertUserInStructure(user, user.government_structure_id, req, structureIndex);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    const newPassword = generateRandomPassword();
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

    await sendEmail(
      user.email,
      `Password Reset - ${process.env.APP_NAME}`,
      `
      Dear ${user.full_name},
      Your password has been reset by an administrator.
      Email: ${user.email}
      New Temporary Password: ${newPassword}
      You will be required to change your password after logging in.
      `
    );

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
