const nodemailer = require("nodemailer");
const { PLATFORM_NAME } = require("../config/platformBranding");
const logger = require("../utils/logger");

class MailerService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    if (!process.env.EMAIL_USER) {
      logger.warn("EMAIL_USER is not defined in environment variables. Email sending may fail.");
    }

    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 465,
      secure: process.env.EMAIL_SECURE === "true" || true, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    this.initialized = true;
    logger.info("MailerService initialized successfully");
  }

  async sendMail({ to, subject, text, html }) {
    if (!this.initialized) {
      this.init();
    }

    try {
      const appName = process.env.APP_NAME || PLATFORM_NAME;
      const fromEmail = process.env.EMAIL_USER || "noreply@novacure.et";
      const fromHeader = process.env.EMAIL_FROM || `"${appName}" <${fromEmail}>`;

      const mailOptions = {
        from: fromHeader,
        to,
        subject,
        text,
      };

      if (html) {
        mailOptions.html = html;
      }

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to} | Subject: ${subject}`);
    } catch (error) {
      logger.error(`Failed to send email to ${to} | Subject: ${subject} | Error: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(to, fullName, temporaryPassword) {
    const subject = `Welcome to ${process.env.APP_NAME || PLATFORM_NAME}!`;
    const text = `
      Dear ${fullName || to || "User"},
      
      Your account has been successfully created.
      Email: ${to}
      Temporary Password: ${temporaryPassword}
      
      Please change your password after your first login.
    `;
    await this.sendMail({ to, subject, text });
  }

  async sendPasswordResetOTP(to, otp) {
    const subject = `Password Reset OTP - ${process.env.APP_NAME || PLATFORM_NAME}`;
    const text = `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`;
    await this.sendMail({ to, subject, text });
  }

  async sendPasswordResetConfirmation(to, fullName, newPassword) {
    const subject = `Password Reset - ${process.env.APP_NAME || PLATFORM_NAME}`;
    const text = `
      Dear ${fullName},
      
      Your password has been reset successfully.
      Email: ${to}
      New Temporary Password: ${newPassword}
      
      Please change your password after logging in.
    `;
    await this.sendMail({ to, subject, text });
  }
}

// Export singleton instance
module.exports = new MailerService();
