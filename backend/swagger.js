const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const {
  PLATFORM_DESCRIPTION,
  PLATFORM_NAME,
} = require("./config/platformBranding");

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: `${PLATFORM_NAME} API`,
      version: "1.0.0",
      description: PLATFORM_DESCRIPTION,
    },
    servers: [
      {
        url: "http://localhost:4000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routers/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
