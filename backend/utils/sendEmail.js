const nodemailer = require("nodemailer");
const logger = require("./logger");

const cleanEnvStr = (val) => {
  if (!val) return "";
  return String(val).replace(/^["']|["']$/g, "").trim();
};

/**
 * Send an email using configured SMTP / service credentials.
 * By default, this function is completely non-blocking and safe:
 * it logs failures and returns `{ success: false, ... }` rather than throwing,
 * ensuring business flows (like user creation) never fail due to email issues.
 */
const sendEmail = async (to, subject, text, options = {}) => {
  const user = cleanEnvStr(process.env.EMAIL_USER);
  const pass = cleanEnvStr(process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD);
  const host = cleanEnvStr(process.env.EMAIL_HOST) || "smtp.gmail.com";
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 465;
  const isSecure = process.env.EMAIL_SECURE !== undefined
    ? process.env.EMAIL_SECURE === "true"
    : port === 465;
  const service = cleanEnvStr(process.env.EMAIL_SERVICE) || (host.includes("gmail") ? "gmail" : undefined);
  const appName = cleanEnvStr(process.env.APP_NAME) || "Ministry of Mines Plan Management System";
  const from = cleanEnvStr(process.env.EMAIL_FROM) || (user ? `"${appName}" <${user}>` : `"${appName}"`);

  // If credentials are not configured, log a warning and return skipped
  if (!user || !pass) {
    const warnMsg = `Email not sent: EMAIL_USER or EMAIL_PASS/EMAIL_PASSWORD is not configured. Skipping email to ${to} (Subject: "${subject}")`;
    logger.warn(warnMsg);
    if (options.throwOnMissingConfig === true) {
      throw new Error("Email service is not configured (missing credentials)");
    }
    return { success: false, skipped: true, reason: "Missing credentials" };
  }

  try {
    const transportConfig = {
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
    };

    if (service) {
      transportConfig.service = service;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions = {
      from,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to} | Subject: ${subject}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to send email to ${to} | Subject: ${subject} | Error: ${error.message}`);
    if (options.throwOnError === true) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
