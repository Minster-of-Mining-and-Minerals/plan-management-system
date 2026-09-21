require("dotenv").config();
const mailerService = require("./services/mailerService");

(async () => {
  try {
    console.log("🔍 Testing email configuration...");

    await mailerService.sendMail({
      to: process.env.EMAIL_USER, 
      subject: "✅ Email Configuration Test",
      text: "This is a test email from NovaCure Platform."
    });

    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
  }
})();
