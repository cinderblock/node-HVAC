// Allow printing with color!
import chalk from 'chalk';

// Unfortunately, the way we run this remotely, chalk auto detects that it should be off
// Let's force it on
chalk.enabled = true;

// Also need to set a level, unless one other than the normal 0 was detected
// Look like up to level 3 (256 color support) works
chalk.level = chalk.level || 3;

function variable(...args: any[]) {
  console.log.apply(console, args.map((val, i) => (i ? chalk.blue : chalk.cyan)(val)));
}

function makeChalkLog(color) {
  return function(...args: any[]) {
    console.log.apply(console, args.map(val => color(val)));
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
