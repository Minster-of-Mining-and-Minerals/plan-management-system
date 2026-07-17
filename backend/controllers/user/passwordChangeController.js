const bcrypt = require("bcrypt");
const { User } = require("../../models");
const { validateNewPassword } = require("../../utils/passwordPolicy");
const { logAudit, auditContextFromReq } = require("../../services/auditService");

exports.changePassword = async (req, res) => {
  const t = await User.sequelize.transaction();
  try {
    const userId = req.user.user_id;
    const { current_password, new_password, confirm_password, confirm_change } =
      req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Current, new, and confirm passwords are required",
      });
    }

    if (confirm_change !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Password change not confirmed. Please confirm before proceeding.",
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const policy = validateNewPassword(new_password);
    if (!policy.ok) {
      return res.status(400).json({ success: false, message: policy.message });
    }

    const user = await User.findOne({
      where: { user_id: userId, is_active: true },
      transaction: t,
    });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Incorrect current password" });
    }

    const isSame = await bcrypt.compare(new_password, user.password);
    if (isSame) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as old password",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update(
      {
        password: hashedPassword,
        password_changed_at: new Date(),
        is_first_logged_in: false,
        token_version: Number(user.token_version || 0) + 1,
        updated_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    const ctx = auditContextFromReq(req);
    await logAudit({
      actorUserId: userId,
      action: "password_change",
      resourceType: "user",
      resourceId: userId,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please sign in again.",
      require_relogin: true,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};
