"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require("../config/config.js")[env];
const db = {};

let sequelize;

const poolConfig = {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

if (process.env.COLLABORATION_DATABASE_URL) {
  sequelize = new Sequelize(process.env.COLLABORATION_DATABASE_URL, poolConfig);
} else if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], poolConfig);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    ...poolConfig,
  });
}

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
