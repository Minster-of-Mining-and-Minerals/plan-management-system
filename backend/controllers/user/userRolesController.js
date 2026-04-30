

const { User, Role, UserRoles } = require("../../models");
const { v4: uuidv4 } = require("uuid");


const assignRolesToUser = async (req, res) => {
  try {
    const { user_id, role_ids, assigned_by } = req.body;

    // Validate user
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate roles
    const roles = await Role.findAll({ where: { role_id: role_ids } });
    if (roles.length !== role_ids.length) {
      return res.status(400).json({
        message: "Some of the provided role IDs are invalid.",
      });
    }

    // Assign roles
    const assignments = roles.map((role) =>
      UserRoles.create({
        user_role_id: uuidv4(),
        user_id: user.user_id,
        user_type: user.user_type_id, 
        role_id: role.role_id,
        assigned_by: assigned_by || null,
        assigned_at: new Date(),
        is_active: true,
      })
    );

    await Promise.all(assignments);

    // Fetch user with roles
    const userWithRoles = await User.findOne({
      where: { user_id: user.user_id },
      include: {
        model: Role,
        as: "roles",
        through: { attributes: ["assigned_at", "assigned_by", "is_active"] },
      },
    });

    return res.status(200).json({
      message: "Roles assigned successfully.",
      data: userWithRoles,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
};


const removeRoleFromUser = async (req, res) => {
  try {
    const { user_id, role_id } = req.body;

    const assignment = await UserRoles.findOne({
      where: { user_id, role_id, is_active: true },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Role not assigned to user." });
    }

    assignment.is_active = false;
    await assignment.save();

    return res.status(200).json({ message: "Role removed from user successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};

module.exports = {
  assignRolesToUser,
  removeRoleFromUser,
};