import chalk from 'chalk';

const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL ?? 'info'] ?? LOG_LEVELS.info;

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(chalk.red('✗'), chalk.red(message), ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(chalk.yellow('⚠'), chalk.yellow(message), ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(chalk.blue('ℹ'), message, ...args);
    }
  },

  success: (message: string, ...args: unknown[]) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(chalk.green('✓'), chalk.green(message), ...args);
    }
  },

  debug: (message: string, ...args: unknown[]) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(chalk.gray('⚙'), chalk.gray(message), ...args);
    }
  },

  step: (message: string, ...args: unknown[]) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(chalk.cyan('→'), message, ...args);
    }
  }
};
