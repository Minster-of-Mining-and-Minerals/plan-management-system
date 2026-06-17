const bcrypt = require("bcrypt");
const { User } = require("../../models");
const { sendEmail } = require("../../utils/sendEmail");
const { Op } = require("sequelize");
const { normalizeEmail } = require("../../utils/emailUtils");

const findActiveUserByEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  return User.findOne({
    where: {
      email: { [Op.iLike]: normalizedEmail },
      is_active: true,
    },
  });
};

const findUserByEmailAndOtp = (email, otp) => {
  const normalizedEmail = normalizeEmail(email);
  return User.findOne({
    where: {
      email: { [Op.iLike]: normalizedEmail },
      otp,
      otp_expiry: { [Op.gt]: new Date() },
    },
  });
};

/**
 * Request OTP for password reset
 */
const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await findActiveUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, an OTP has been sent.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      otp,
      otp_expiry: otpExpiry,
    });

    const subject = "Password Reset OTP - Plan Management System";
    const text = `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`;

    await sendEmail(normalizedEmail, subject, text);

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

    const user = await findUserByEmailAndOtp(email, otp);

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

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const user = await findUserByEmailAndOtp(email, otp);

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
