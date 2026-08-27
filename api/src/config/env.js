import dotenv from "dotenv";

dotenv.config({
  path:
    process.env.NODE_ENV === "test"
      ? ".env.test"
      : ".env",
});

const requiredEnv = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }
}

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",

  port,

  mongoUri: process.env.MONGO_URI,

  corsOrigin:
    process.env.CORS_ORIGIN || "http://localhost:5173",

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,

  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

  jwtAccessExpiresIn:
    process.env.JWT_ACCESS_EXPIRES_IN || "15m",

  jwtRefreshExpiresIn:
    process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  cookieSecure:
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production",

  cookieSameSite:
    process.env.COOKIE_SAME_SITE || "lax",
});
