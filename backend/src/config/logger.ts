import winston from "winston";
import envVars from "./envVars.js";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const logger = winston.createLogger({
  level: envVars.NODE_ENV === "development" ? "debug" : "info",
  levels,
  format,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(format),
    }),
  ],
});

export { logger };
export default logger;
