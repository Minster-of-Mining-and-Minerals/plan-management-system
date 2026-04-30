const {
  User,
  UserType,
  UserPosition,
  Role,
  UserRoles,
  sequelize,
} = require("../../models");
const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const { generateRandomPassword } = require("../../utils/password");
const { sendEmail } = require("../../utils/sendEmail");

const getUserTypes = async (req, res) => {
  try {
    const userTypes = await UserType.findAll({
      attributes: ["name", "description", "created_at", "updated_at"],
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "User types fetched successfully",
      data: userTypes,
    });
  } catch (error) {
    console.error("Error fetching user types:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user types",
      error: error.message,
    });
  }
};
const getUserPositions = async (req, res) => {
  try {
    const userPositions = await UserPosition.findAll({
      attributes: [
        "user_position_id",
        "name",
        "description",
        "created_at",
        "updated_at",
      ],
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "User positions fetched successfully",
      data: userPositions,
    });
  } catch (error) {
    console.error("Error fetching user positions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user positions",
      error: error.message,
    });
  }
};

const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { full_name, email, user_type_id, role_ids, phone_number } = req.body;

    // ====== Check existing email ======
    const existingUser = await User.findOne({
      where: { email },
      transaction: t,
    });
    if (existingUser) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "User already exists." });
    }

    // ====== Validate user type ======
    const userType = await UserType.findByPk(user_type_id, { transaction: t });
    if (!userType) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Invalid user type." });
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

    // ====== Generate password ======
    // const password = generateRandomPassword();
    const password = "password";
    const hashedPassword = await bcrypt.hash(password, 10);

    // ====== Create User ======
    const user = await User.create(
      {
        user_id: uuidv4(),
        full_name,
        email,
        password: hashedPassword,
        phone_number,
        user_type_id,
        is_first_logged_in: true,
        is_active: true,
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
      email,
      user_type_id,
      phone_number,
      is_active,
      role_ids,
    } = req.body;

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

    // ====== Validate user type ======
    if (user_type_id) {
      const userType = await UserType.findByPk(user_type_id, {
        transaction: t,
      });
      if (!userType) {
        await t.rollback();
        return res
          .status(400)
          .json({ success: false, message: "Invalid user type." });
      }
    }

    // ====== Update user ======
    await user.update(
      {
        full_name: full_name ?? user.full_name,
        email: email ?? user.email,
        phone_number: phone_number ?? user.phone_number,
        user_type_id: user_type_id ?? user.user_type_id,
        is_active: is_active ?? user.is_active,
        updated_at: new Date(),
      },
      { transaction: t }
    );

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
      // institute_id,
      user_type_id,
      is_active,
      search, // optional: for name/email search
    } = req.query;

    // ====== Build filters dynamically ======
    const whereClause = {};

    // if (institute_id) whereClause.institute_id = institute_id;
    if (user_type_id) whereClause.user_type_id = user_type_id;
    if (is_active !== undefined) whereClause.is_active = is_active === "true";

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
      include: [
        {
          model: UserType,
          as: "userType",
          attributes: ["user_type_id", "name"],
        },
      ],
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
      include: [
        {
          model: UserType,
          as: "userType",
          attributes: ["user_type_id", "name"],
        },
        {
          model: Role,
          as: "roles",
          through: { attributes: [] },
        },
      ],
    });

    if (!user) {
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
        is_first_logged_in: false,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    // Send email notification
    await sendEmail(
      user.email,
      `Password Reset - ${process.env.APP_NAME}`,
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
        "position",
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
          model: UserType,
          as: "userType",
          attributes: ["user_type_id", "name", "description"],
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
  getUserTypes,
  getUserPositions,
};
