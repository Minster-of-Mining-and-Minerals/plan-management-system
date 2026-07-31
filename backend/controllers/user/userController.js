const {
  User,
  Role,
  UserRoles,
  sequelize,
  PermissionGroup,
} = require("../../models");
const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const { generateRandomPassword } = require("../../utils/password");
const { sendEmail } = require("../../utils/sendEmail");
const { PLATFORM_NAME } = require("../../config/platformBranding");
const { ACCOUNT_TYPES } = require("../../config/accountTypes");
const { InternalUserProfile, Department, UserTitle } = require("../../models");
const { listUsersWithPermission } = require("../../services/userPermissionService");
const { logAudit, auditContextFromReq } = require("../../services/auditService");

async function resolveTitleId(body, transaction) {
  const title_id = body.title_id || null;
  if (!title_id) return null;

  const title = await UserTitle.findByPk(title_id, { transaction });
  if (!title) {
    const err = new Error("User title not found");
    err.status = 400;
    throw err;
  }
  return title_id;
}

async function resolveDepartmentFields(body, transaction) {
  const department_id = body.department_id || null;
  let departmentName = body.department?.trim() || null;

  if (department_id) {
    const dept = await Department.findByPk(department_id, { transaction });
    if (!dept) {
      const err = new Error("Department not found");
      err.status = 400;
      throw err;
    }
    departmentName = dept.name;
  }

  return { department_id, department: departmentName };
}

async function upsertInternalProfile(userId, fields, transaction) {
  const existing = await InternalUserProfile.findOne({
    where: { user_id: userId },
    transaction,
  });

  if (existing) {
    await existing.update(fields, { transaction });
    return existing;
  }

  return InternalUserProfile.create(
    {
      user_id: userId,
      ...fields,
    },
    { transaction }
  );
}

const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userData = req.validatedUserData || {};
    const role_ids = req.validatedRoleIds ?? req.body.role_ids;
    const { email, full_name, phone_number } = userData;

    const existingUser = email
      ? await User.findOne({
        where: { email },
        transaction: t,
      })
      : null;
    if (existingUser) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "User already exists." });
    }


    // ====== MULTIPLE ROLE VALIDATION ======
    if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
      const roles = await Role.findAll({
        where: { role_id: role_ids },
        transaction: t,
      });

      if (roles.length !== role_ids.length) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "One or more provided role IDs are invalid.",
        });
      }
    }

    // ====== Generate one-time password (shown once to creator + emailed) ======
    const password = "password";
    // const password = generateRandomPassword(12);
    const hashedPassword = await bcrypt.hash(password, 10);

    // ====== Create User ======
    const user = await User.create(
      {
        user_id: uuidv4(),
        full_name,
        email,
        password: hashedPassword,
        phone_number: phone_number ?? null,
        is_active: true,
        is_first_logged_in: true,
        account_type: ACCOUNT_TYPES.INTERNAL,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: t }
    );

    const deptFields = await resolveDepartmentFields(req.body, t);
    const title_id = await resolveTitleId(req.body, t);

    await InternalUserProfile.create(
      {
        user_id: user.user_id,
        department_id: deptFields.department_id,
        department: deptFields.department,
        title_id,
        job_title: req.body.job_title || null,
        employee_id: req.body.employee_id || null,
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

    await t.commit();

    // ====== Send welcome email ======
    await sendEmail(
      email,
      `Welcome to ${process.env.APP_NAME || PLATFORM_NAME}!`,
      `
      Dear ${full_name || email || "User"},
      Your account has been successfully created.
      Email: ${email}
      Temporary Password: ${password}
      Please change your password after first login.
    `
    );

    const userJson = user.toJSON();
    delete userJson.password;

    await logAudit({
      actorUserId: req.user?.user_id,
      action: "user_create",
      resourceType: "user",
      resourceId: user.user_id,
      details: {
        ...auditContextFromReq(req, {
          module: "users",
          outcome: "success",
          next: {
            email: user.email,
            account_type: user.account_type,
            role_ids: role_ids || [],
          },
        }).details,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userJson,
      temporary_password: password,
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
    const userData = req.validatedUserData || {};
    const role_ids = req.validatedRoleIds ?? req.body.role_ids;
    const { full_name, email, phone_number } = userData;

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

    // ====== Check for email duplication ======
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: { email },
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
    const updates = { updated_at: new Date() };
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone_number !== undefined) updates.phone_number = phone_number;

    await user.update(updates, { transaction: t });

    if (
      req.body.department_id !== undefined ||
      req.body.department !== undefined ||
      req.body.title_id !== undefined ||
      req.body.job_title !== undefined ||
      req.body.employee_id !== undefined ||
      req.body.signature_file !== undefined ||
      req.body.signature_enabled !== undefined
    ) {
      const profileUpdates = {};
      if (req.body.job_title !== undefined) {
        profileUpdates.job_title = req.body.job_title || null;
      }
      if (req.body.employee_id !== undefined) {
        profileUpdates.employee_id = req.body.employee_id || null;
      }
      if (req.body.title_id !== undefined) {
        profileUpdates.title_id = await resolveTitleId(req.body, t);
      }
      if (
        req.body.department_id !== undefined ||
        req.body.department !== undefined
      ) {
        const deptFields = await resolveDepartmentFields(req.body, t);
        profileUpdates.department_id = deptFields.department_id;
        profileUpdates.department = deptFields.department;
      }
      if (req.body.signature_file !== undefined) {
        profileUpdates.signature_file = req.body.signature_file || null;
        if (!req.body.signature_file) {
          profileUpdates.signature_enabled = false;
        }
      }
      if (req.body.signature_enabled !== undefined) {
        profileUpdates.signature_enabled = Boolean(req.body.signature_enabled);
      }
      await upsertInternalProfile(user_id, profileUpdates, t);
    }

    // ====== Update roles if provided ======
    if (role_ids && Array.isArray(role_ids)) {
      // Validate roles exist
      const roles = await Role.findAll({
        where: { role_id: role_ids },
        transaction: t,
      });
      if (roles.length !== role_ids.length) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "One or more provided role IDs are invalid.",
        });
      }

      // Delete old roles
      await UserRoles.destroy({
        where: { user_id },
        transaction: t,
      });

      // Assign new roles
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

    await t.commit();

    await logAudit({
      actorUserId: req.user?.user_id,
      action: "user_update",
      resourceType: "user",
      resourceId: user_id,
      details: {
        ...auditContextFromReq(req, {
          module: "users",
          outcome: "success",
          next: {
            full_name: user.full_name,
            email: user.email,
            role_ids: role_ids || undefined,
          },
        }).details,
      },
      ipAddress: req.ip,
    });

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
      department_id,
    } = req.query;
    const {
      getPagination,
      getPagingData,
      parsePageLimit,
      wantsPagination,
    } = require("../../utils/pagination");

    const whereClause = { account_type: ACCOUNT_TYPES.INTERNAL };

    if (is_active !== undefined) whereClause.is_active = is_active === "true";
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const titleInclude = {
      model: UserTitle,
      as: "titleRef",
      attributes: ["title_id", "name", "code", "status"],
      required: false,
    };

    const profileInclude = {
      model: InternalUserProfile,
      as: "internalProfile",
      required: Boolean(department_id),
      include: [
        {
          model: Department,
          as: "departmentRef",
          attributes: ["department_id", "name", "code", "status"],
          required: false,
        },
        titleInclude,
      ],
    };

    if (department_id) {
      profileInclude.where = { department_id };
    }

    const receivePatientUsers = await listUsersWithPermission(
      "patients",
      "receive_patient"
    );
    const receiveAppointmentUsers = await listUsersWithPermission(
      "patients",
      "receive_appointment"
    );
    const receivePatientIds = new Set(
      receivePatientUsers.map((u) => u.user_id)
    );
    const receiveAppointmentIds = new Set(
      receiveAppointmentUsers.map((u) => u.user_id)
    );

    const enrich = (u) => {
      const plain = u.get({ plain: true });
      return {
        ...plain,
        can_receive_patient: receivePatientIds.has(plain.user_id),
        can_receive_appointment: receiveAppointmentIds.has(plain.user_id),
      };
    };

    const paginate = wantsPagination(req.query);
    if (paginate) {
      const { page, limit } = parsePageLimit(req.query, {
        page: 1,
        limit: 20,
        maxLimit: 100,
      });
      const { limit: take, offset } = getPagination(page, limit);
      const result = await User.findAndCountAll({
        where: whereClause,
        include: [profileInclude],
        order: [["created_at", "DESC"]],
        distinct: true,
        limit: take,
        offset,
      });
      const paging = getPagingData(
        {
          count: Array.isArray(result.count) ? result.count.length : result.count,
          rows: result.rows,
        },
        page,
        limit
      );
      return res.status(200).json({
        success: true,
        message: "Users fetched successfully.",
        data: paging.results.map(enrich),
        pagination: {
          total: paging.total,
          totalPages: paging.totalPages,
          currentPage: paging.currentPage,
          limit: paging.limit,
        },
      });
    }

    const users = await User.findAll({
      where: whereClause,
      include: [profileInclude],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      data: users.map(enrich),
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
      include: [
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
        },
        {
          model: PermissionGroup,
          as: "permissionGroups",
          through: { attributes: [] },
        },
        {
          model: InternalUserProfile,
          as: "internalProfile",
          required: false,
          include: [
            {
              model: Department,
              as: "departmentRef",
              attributes: ["department_id", "name", "code", "status"],
              required: false,
            },
            {
              model: UserTitle,
              as: "titleRef",
              attributes: ["title_id", "name", "code", "status"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.account_type === ACCOUNT_TYPES.PATIENT) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
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

    // Soft delete (deactivate)
    await user.update(
      { is_active: false, updated_at: new Date() },
      { transaction: t }
    );
    await t.commit();

    await logAudit({
      actorUserId: req.user?.user_id,
      action: "user_deactivate",
      resourceType: "user",
      resourceId: id,
      details: {
        ...auditContextFromReq(req, {
          module: "users",
          outcome: "success",
          previous: { is_active: true, email: user.email },
          next: { is_active: false },
        }).details,
      },
      ipAddress: req.ip,
    });

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

    // Generate and hash new password
    const newPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update(
      {
        password: hashedPassword,
        is_first_logged_in: true,
        token_version: Number(user.token_version || 0) + 1,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    const ctx = auditContextFromReq(req, { target_email: user.email });
    await logAudit({
      actorUserId: req.user?.user_id,
      action: "password_reset_admin",
      resourceType: "user",
      resourceId: user.user_id,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });

    // Send email notification
    await sendEmail(
      user.email,
      `Password Reset - ${process.env.APP_NAME || PLATFORM_NAME}`,
      `
      Dear ${user.full_name},
      Your password has been reset successfully.
      Email: ${user.email}
      New Temporary Password: ${newPassword}
      Please change your password after logging in.
      `
    );

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. The new password has been sent via email.",
      temporary_password: newPassword,
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
      attributes: [
        "user_id",
        "full_name",
        "email",
        "phone_number",
        "profile_image",
        "is_first_logged_in",
        "last_login_at",
        "password_changed_at",
        "is_active",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: InternalUserProfile,
          as: "internalProfile",
          attributes: [
            "profile_id",
            "signature_file",
            "signature_enabled",
            "job_title",
            "department",
          ],
        },
      ],
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

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

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActiveStatus,
  resetUserPassword,
  getProfile,
};
