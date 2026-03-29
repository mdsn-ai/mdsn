export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface CreateLoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(
  level: LogLevel,
  prefix: string | undefined,
  message: string,
  context?: Record<string, unknown>,
): string {
  const timestamp = formatTimestamp();
  const prefixPart = prefix ? `[${prefix}] ` : "";
  const contextPart = context ? ` ${JSON.stringify(context)}` : "";
  return `${timestamp} ${prefixPart}${level.toUpperCase()}: ${message}${contextPart}`;
}

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = options.level ?? "info";
  const prefix = options.prefix;
  const levelNumber = LOG_LEVELS[level];

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      if (levelNumber <= LOG_LEVELS.debug) {
        console.debug(formatMessage("debug", prefix, message, context));
      }
    },
    info(message: string, context?: Record<string, unknown>): void {
      if (levelNumber <= LOG_LEVELS.info) {
        console.info(formatMessage("info", prefix, message, context));
      }
    },
    warn(message: string, context?: Record<string, unknown>): void {
      if (levelNumber <= LOG_LEVELS.warn) {
        console.warn(formatMessage("warn", prefix, message, context));
      }
    },
    error(message: string, context?: Record<string, unknown>): void {
      if (levelNumber <= LOG_LEVELS.error) {
        console.error(formatMessage("error", prefix, message, context));
      }
    },
  };
}
