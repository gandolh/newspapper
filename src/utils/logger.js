import chalk from 'chalk';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

export const logger = {
  error: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(chalk.red('✗'), chalk.red(message), ...args);
    }
  },

  warn: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(chalk.yellow('⚠'), chalk.yellow(message), ...args);
    }
  },

  info: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(chalk.blue('ℹ'), message, ...args);
    }
  },

  success: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(chalk.green('✓'), chalk.green(message), ...args);
    }
  },

  debug: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(chalk.gray('⚙'), chalk.gray(message), ...args);
    }
  },

  step: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(chalk.cyan('→'), message, ...args);
    }
  }
};
