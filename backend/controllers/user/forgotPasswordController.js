const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { User } = require("../../models");
const mailerService = require("../../services/mailerService");
const { Op } = require("sequelize");
const { PLATFORM_NAME } = require("../../config/platformBranding");
const { validateNewPassword } = require("../../utils/passwordPolicy");
const { logAudit } = require("../../services/auditService");

/**
 * Request OTP for password reset
 */
const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ where: { email, is_active: true } });

    if (!user) {
      // For security reasons, don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, an OTP has been sent."
      });
    }

    // CSPRNG 6-digit OTP
    const otp = String(crypto.randomInt(100000, 1000000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      otp,
      otp_expiry: otpExpiry,
    });

    await mailerService.sendPasswordResetOTP(email, otp);

    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, an OTP has been sent.",
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({
      where: {
        email,
        otp,
        otp_expiry: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Reset Password
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Email, OTP, and new password are required" });
    }

    const policy = validateNewPassword(newPassword);
    if (!policy.ok) {
      return res.status(400).json({ success: false, message: policy.message });
    }

    const user = await User.findOne({
      where: {
        email,
        otp,
        otp_expiry: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({
      password: hashedPassword,
      otp: null,
      otp_expiry: null,
      is_first_logged_in: false,
      password_changed_at: new Date(),
      token_version: Number(user.token_version || 0) + 1,
    });

    await logAudit({
      actorUserId: user.user_id,
      action: "password_reset",
      resourceType: "user",
      resourceId: user.user_id,
      details: { email: user.email, method: "otp" },
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  requestOTP,
  verifyOTP,
  resetPassword,
};
