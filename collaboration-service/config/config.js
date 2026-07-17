const path = require("path");

const collaborationEnvPath = path.join(__dirname, "../.env");
const backendEnvPath = path.join(__dirname, "../../backend/.env");

function loadDotenv(dotenvPath, options) {
  try {
    // Optional: Docker already injects env; local/dev may use dotenv from node_modules.
    require("dotenv").config({ path: dotenvPath, ...options });
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") {
      throw error;
    }
  }
}

loadDotenv(collaborationEnvPath);
if (
  !process.env.COLLABORATION_DB_PASSWORD &&
  !process.env.DB_PASSWORD &&
  !process.env.COLLABORATION_DATABASE_URL
) {
  loadDotenv(backendEnvPath, { override: false });
}

const pool = {
  max: 10,
  min: 0,
  acquire: 30000,
  idle: 10000,
};

function buildDbConfig() {
  if (process.env.COLLABORATION_DATABASE_URL) {
    return {
      use_env_variable: "COLLABORATION_DATABASE_URL",
      dialect: process.env.DB_DIALECT || "postgres",
      pool,
    };
  }

  const password =
    process.env.COLLABORATION_DB_PASSWORD ?? process.env.DB_PASSWORD;
  if (password === undefined || password === null) {
    throw new Error(
      "Database password is missing. Set COLLABORATION_DB_PASSWORD or DB_PASSWORD in backend/.env."
    );
  }

  return {
    username:
      process.env.COLLABORATION_DB_USERNAME ||
      process.env.DB_USERNAME ||
      "postgres",
    password: String(password),
    database: process.env.COLLABORATION_DB_NAME || "collaboration_service",
    host:
      process.env.COLLABORATION_DB_HOST || process.env.DB_HOST || "localhost",
    port: Number(
      process.env.COLLABORATION_DB_PORT || process.env.DB_PORT || 5432
    ),
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
