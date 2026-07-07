const path = require("path");

const collaborationEnvPath = path.join(__dirname, "../.env");
const backendEnvPath = path.join(__dirname, "../../backend/.env");

require("dotenv").config({ path: collaborationEnvPath });
if (!process.env.DB_PASSWORD && !process.env.DATABASE_URL) {
  require("dotenv").config({ path: backendEnvPath, override: false });
}

const pool = {
  max: 10,
  min: 0,
  acquire: 30000,
  idle: 10000,
};

function buildDbConfig() {
  if (process.env.DATABASE_URL) {
    return {
      use_env_variable: "DATABASE_URL",
      dialect: process.env.DB_DIALECT || "postgres",
      pool,
    };
  }

  const password = process.env.DB_PASSWORD;
  if (password === undefined || password === null) {
    throw new Error(
      "Database password is missing. Create collaboration-service/.env or set DB_PASSWORD in backend/.env."
    );
  }

  return {
    username: process.env.DB_USERNAME || "postgres",
    password: String(password),
    database: process.env.DB_NAME || "collaboration_service",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    dialect: process.env.DB_DIALECT || "postgres",
    pool,
  };
}

const sharedConfig = buildDbConfig();

module.exports = {
  development: sharedConfig,
  test: sharedConfig,
  production: sharedConfig,
};