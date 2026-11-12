"use strict";

const bcrypt = require("bcrypt");
const db = require("../models");
const { User } = db;

async function resetAdminPassword() {
  const adminEmail = process.argv[2] || "admin@gmail.com";
  const newPassword = process.argv[3] || "#Admin@2026MoM";

  try {
    const user = await User.scope("withCredentials").findOne({
      where: { email: adminEmail },
    });

    if (!user) {
      console.error(`User with email '${adminEmail}' not found.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({
      password: hashedPassword,
      password_changed_at: new Date(),
      is_first_logged_in: false,
      is_active: true,
    });

    console.log(`Successfully updated password for ${adminEmail} to: ${newPassword}`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to reset password:", err);
    process.exit(1);
  }
}

resetAdminPassword();
