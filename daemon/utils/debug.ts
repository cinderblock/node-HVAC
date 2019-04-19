// Allow printing with color!
import chalk from 'chalk';

type Colorizer = (input: string) => string;

type ColorList = Colorizer[] | { colors: Colorizer[]; modulo?: number; numbers?: 'always' | 'auto' };

export function makeVariableLog(colors: ColorList, prefix?: string) {
  const arr = Array.isArray(colors) ? colors : colors.colors;
  const mod = !Array.isArray(colors) && colors.modulo !== undefined ? colors.modulo : arr.length > 1 ? 2 : 1;
  const numbers = !Array.isArray(colors) && colors.numbers === 'always';

  function colorize(val: any, i: number): any {
    if (!(typeof val == 'string' || (numbers && typeof val == 'number'))) return val;

    if (i >= arr.length) {
      if (!mod) return val;
      i -= arr.length;
      i %= mod;
      i += arr.length - mod;
    }

    return arr[i]('' + val);
  }

  return (...args: any[]) => console.log(...(prefix ? [prefix, ...args] : args).map(colorize));
}

function makeChalkLog(color: (s: string) => string) {
  return function(...args: any[]) {
    console.log(...args.map(val => color(val)));
  };
}

export const green = makeChalkLog(chalk.green);
export const red = makeChalkLog(chalk.red);
export const yellow = makeChalkLog(chalk.yellow);
export const magenta = makeChalkLog(chalk.magenta);
export const cyan = makeChalkLog(chalk.cyan);
export const grey = makeChalkLog(chalk.grey);

export const noColor = console.log;

/**
 * Prints the first argument in blue, second in cyan, rest in alternating greys
 *
 * @param args List of data to print with varying colors.
 */
export const variable = makeVariableLog([chalk.blue, chalk.cyan, chalk.grey, chalk.dim]);
export const error = makeVariableLog([chalk.red, chalk.cyan, chalk.yellow, chalk.grey, chalk.dim], 'Error:');
export const info = makeVariableLog([chalk.grey, chalk.yellow, chalk.cyan, chalk.grey, chalk.dim], 'Info:');
