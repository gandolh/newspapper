function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

export const log = {
  info(...args: unknown[]): void {
    console.log(`[${ts()}]`, ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(`[${ts()}] warn:`, ...args);
  },
  error(...args: unknown[]): void {
    console.error(`[${ts()}] error:`, ...args);
  },
};
