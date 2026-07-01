import fs from "fs";
import path from "path";
import winston from "winston";
import { getCurrentTimestampLogger } from "./utils.js";

const logsDir = path.join(process.cwd(), "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const currentDate = new Date().toISOString().split("T")[0];

const logger = winston.createLogger({
  level: "error",

format: winston.format.combine(
  winston.format.timestamp({
    format: () => getCurrentTimestampLogger(),
  }),

  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let output = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (meta.api) {
      output += `\nAPI    : ${meta.api}`;
    }

    if (meta.method) {
      output += `\nMETHOD : ${meta.method}`;
    }

    if (meta.userId) {
      output += `\nUSER   : ${meta.userId}`;
    }

    if (meta.data) {
      output += `\nDATA:\n${JSON.stringify(meta.data, null, 2)}`;
    }

    return output;
  })
),

  transports: [

    new winston.transports.File({
      level: "error",
      filename: path.join(logsDir, `${currentDate}-error.log`),
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;