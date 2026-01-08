import pino from "pino";

export const logger =
  process.env.NODE_ENV === "production"
    ? pino({ level: process.env.LOG_LEVEL ?? "info" })
    : pino({
        level: process.env.LOG_LEVEL ?? "info",
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
      });
