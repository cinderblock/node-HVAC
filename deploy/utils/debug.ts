// Allow printing with color!
import chalk from 'chalk';

/**
 * Prints the first argument in blue, second in cyan, rest in alternating greys
 *
 * @param args List of data to print with varying colors.
 */
function variable(...args: any[]) {
  console.log(...args.map((val, i) => (i ? chalk.blue : i === 1 ? chalk.cyan : i % 2 ? chalk.grey : chalk.dim)(val)));
}

function makeChalkLog(color: (s: string) => string) {
  return function(...args: any[]) {
    console.log(...args.map(val => color(val)));
  };
}

const green = makeChalkLog(chalk.green);
const red = makeChalkLog(chalk.red);
const yellow = makeChalkLog(chalk.yellow);
const magenta = makeChalkLog(chalk.magenta);
const grey = makeChalkLog(chalk.grey);

export default {
  log: console.log,
  variable,
  green,
  yellow,
  red,
  magenta,
  grey,
  error: red,
  warn: yellow,
  notice: magenta,
  info: grey,
};
