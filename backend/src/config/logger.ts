import winston from "winston";
import envVars from "./envVars.js";

const isProduction = envVars.NODE_ENV === "production";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

// Console format (human readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
      return `${timestamp} ${level}: ${message} ${metaString}`;
    }
  )
);

// Production File/JSON format (machine readable)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  levels,
  format: isProduction ? productionFormat : consoleFormat,
  transports: [
    new winston.transports.Console({
      format: isProduction ? productionFormat : consoleFormat,
    }),
  ],
});

// In production, also log to files for persistence
if (isProduction) {
  logger.add(new winston.transports.File({ 
    filename: "logs/error.log", 
    level: "error",
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
  logger.add(new winston.transports.File({ 
    filename: "logs/combined.log",
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }));
}

export { logger };
export default logger;
