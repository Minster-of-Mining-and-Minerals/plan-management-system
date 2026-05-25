const nodemailer = require("nodemailer");
const { PLATFORM_NAME } = require("../config/platformBranding");
const logger = require("./logger"); // your custom logger

const sendEmail = async (to, subject, text) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 465,
      secure: process.env.EMAIL_SECURE === "true" || true, // true for port 465, false for others
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Define mail options
    const mailOptions = {
      from: `"${process.env.APP_NAME || PLATFORM_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Log success
    logger.info(`Email sent to ${to} | Subject: ${subject}`);
  } catch (error) {
    // Log error
    logger.error(`Failed to send email to ${to} | Subject: ${subject} | Error: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = { sendEmail };
