// ============================================================================
// SIMPLE LOGGER UTILITY
// Prints readable logs with the service name and timestamp.
// ============================================================================

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createLogger(serviceName: string): Logger {
  return {
    info(message: string, meta?: Record<string, unknown>) {
      console.log(`[INFO] [${serviceName}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn(message: string, meta?: Record<string, unknown>) {
      console.warn(`[WARN] [${serviceName}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error(message: string, meta?: Record<string, unknown>) {
      console.error(`[ERROR] [${serviceName}] ${message}`, meta ? JSON.stringify(meta) : '');
    },
  };
}
