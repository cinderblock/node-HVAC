#!/usr/bin/env node
import SSH2Promise = require('ssh2-promise');
import ts = require('typescript');
import { Observable, combineLatest, merge } from 'rxjs';
import { debounceTime, map, filter, mergeMap } from 'rxjs/operators';

import observeFileChange from './utils/observeFile';
import config from './config';
import { ClientChannel, ExecOptions } from 'ssh2';
import { ConnectOptions } from './utils/ssh2.types';
import * as debug from './utils/debug';
import chalk from 'chalk';
import { createServer, Socket } from 'net';
import { join } from 'path';
import { promises as fs } from 'fs';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

export type Options = {
  remote: {
    connect: ConnectOptions;
    directory?: string;
  };
  local?: { path?: string };
};

export default async function watchBuildTransferRun(options: Options) {
  options.local = options.local || {};
  options.local.path = options.local.path || '../daemon/';

  const configPath = ts.findConfigFile(options.local.path, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('Could not find a valid tsconfig.json.');
  }

  if (!(options.remote.connect.agent || options.remote.connect.privateKey || options.remote.connect.password)) {
    if (process.platform === 'win32') options.remote.connect.agent = 'pageant';
    else if (process.env.SSH_AUTH_SOCK) options.remote.connect.agent = process.env.SSH_AUTH_SOCK;
    else if (process.env.HOME) {
      const keyFiles = ['id_rsa'];
      for (const f in keyFiles) {
        try {
          options.remote.connect.privateKey = await fs.readFile(join(process.env.HOME, '.ssh', f));
          break;
        } catch (e) {}
      }
      if (!options.remote.connect.privateKey) {
        // No private key found!
      }
      // TODO: Handle other keys
    } else {
      // No auth defined???
    }
  }

  // TODO: Capture so that we can close gracefully
  createServer(user => {
    const client = new Socket();

    client.connect(8000, options.remote.connect.host);

    // 2-way pipe
    user.pipe(client).pipe(user);

    const colors = [chalk.magenta, chalk.cyan, chalk.yellow, chalk.grey, chalk.dim];

    // Catch non-fatal errors
    client.on('error', debug.makeVariableLog(colors, 'Proxy client error:'));
    user.on('error', debug.makeVariableLog(colors, 'Proxy user error:'));

    // TODO: Should we destroy on close?
    // client.on('close', user.destroy);
    // user.on('close', client.destroy);
  }).listen(8000);

  options.remote.connect.reconnectDelay = options.remote.connect.reconnectDelay || 250;
  options.remote.connect.reconnect = false;

  // options.remote.connect.debug = msg => debug.info('SSH DEBUG:', msg);

  const ssh = new SSH2Promise(options.remote.connect);

  await ssh.connect().catch((e: Error) => {
    debug.error(e.name, e);
    throw 'Connection failed';
  });

  const sftp = ssh.sftp();

  async function mkdir(dir: string | string[]) {
    const execOptions: ExecOptions = {};

    return ssh.exec('mkdir', ['-p', ...(typeof dir === 'string' ? [dir] : dir)], execOptions);
  }

  const remoteDaemonDir = (options.remote.directory ? options.remote.directory + '/' : '') + 'daemon';
  await mkdir(remoteDaemonDir);

  async function updatePackages() {
    debug.info('Updating package.json and yarn.lock');

    await Promise.all([
      sftp.fastPut(options.local.path + 'package.json', remoteDaemonDir + '/package.json'),
      sftp.fastPut(options.local.path + 'yarn.lock', remoteDaemonDir + '/yarn.lock'),
    ]).catch((e: Error) => {
      debug.error(e.name, 'Failed to put files', e);
    });

    debug.info('Updated package.json and yarn.lock');

    await remoteExecYarn();

    debug.info('Yarn ran');
  }

  let buildingCount = 0;

  function markBuilding() {
    buildingCount++;
  }

  function doneBuilding() {
    buildingCount--;
  }

  const packageUpdates = merge(
    observeFileChange(options.local.path + 'package.json'),
    observeFileChange(options.local.path + 'yarn.lock')
  )
    // Writes to these files come in bursts. We only need to react after the burst is done.
    .pipe(debounceTime(200))
    // Mark that we're building and shouldn't start a run
    .pipe(map(markBuilding))
    // Kill running instance (and wait for it to finish cleanly)
    .pipe(mergeMap(killRunning))
    // Copy the files and run yarn over ssh. Don't re-run until that is complete.
    .pipe(mergeMap(updatePackages))
    .pipe(map(doneBuilding))
    .pipe(map(() => debug.green('Packages updated')));

  const buildAndPush = new Observable<void>(observable => {
    const host = ts.createWatchCompilerHost(
      configPath,
      { outDir: options.remote.directory || '' },
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      reportDiagnostic,
      reportWatchStatusChanged
    );

    const origCreateProgram = host.createProgram;
    host.createProgram = (rootNames: ReadonlyArray<string>, options, host, oldProgram) => {
      debug.cyan('Starting new compilation');
      markBuilding();
      // Might be nice to wait for it to finish... Not sure how.
      killRunning();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    const origPostProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = async program => {
      debug.magenta('Finished compilations');

      const data: [string, string][] = [];

      program.emit(undefined, (filename, source) => data.push([filename, source]));

      const remoteConfig = data.find(([f]) => f == remoteDaemonDir + '/config.remote.js');
      const localConfig = data.findIndex(([f]) => f == remoteDaemonDir + '/config.js');
      if (remoteConfig) {
        if (localConfig > -1) {
          debug.info('Removing config.js from copy list');
          data.splice(localConfig, 1);
        }
        debug.info('Renaming config.remote.js in copy list');
        remoteConfig[0] = remoteDaemonDir + '/config.js';
      }

      const dirs = data
        // Strip filenames
        .map(([filename]) => filename.replace(/\/[^/]*$/, ''))
        // non-empty and Unique
        .filter((value, i, arr) => value && arr.indexOf(value) === i)
        // Filter to only needed mkdirs, keep if we don't find any others that would make the current dir
        .filter((value, i, arr) => !arr.find((other, j) => i !== j && other.startsWith(value)));

      await mkdir(dirs);

      await Promise.all(data.map(([file, data]) => sftp.writeFile(file, data, {})));

      // Wait for previous execution to get killed (if not already)
      await running;

      observable.next();

      // TODO: Check if there is something that this was doing that we needed.
      // origPostProgramCreate(program);
    };

    ts.createWatchProgram(host);

    // TODO: return teardown logic
  })
    .pipe(map(doneBuilding))
    .pipe(map(() => debug.green('Sources updated')));

  let running: Promise<void>;
  let spawn: ClientChannel & { kill: () => void };

  async function killRunning() {
    type Signal =
      | 'ABRT'
      | 'ALRM'
      | 'FPE'
      | 'HUP'
      | 'ILL'
      | 'INT'
      | 'KILL'
      | 'PIPE'
      | 'QUIT'
      | 'SEGV'
      | 'TERM'
      | 'USR1'
      | 'USR2';

    const signal: Signal = 'INT';

    if (spawn && running) {
      debug.grey('Signaling');
      // TODO: Test this...
      spawn.kill();
      spawn = undefined;
    }

    return running;
  }

  function remoteDataPrinter(process: string, stream: 'stderr' | 'stdout') {
    const log = debug.makeVariableLog(
      { colors: [chalk.grey, chalk.grey, stream == 'stderr' ? chalk.magenta : chalk.yellow], modulo: 0 },
      'Remote'
    );

    return (data: Buffer) => {
      // debug.info('incoming data:', data);
      data
        .toString()
        .trimRight()
        .split('\n')
        .map(line => log(process, stream, line.trimRight()));
      // debug.info('Finished block');
    };
  }

  async function remoteExecNode() {
    debug.yellow('Running');

    // This means we messed up...
    if (running) throw 'Already running!';

    const execOptions: ExecOptions = {};

    try {
      const args = [remoteDaemonDir];
      debug.variable('Spawning:', 'node', args, execOptions);
      spawn = await ssh.spawn('node', args, execOptions);

      spawn.allowHalfOpen = false;

      // Remove verboseness from ssh.spawn
      spawn.removeAllListeners('finish');
      spawn.removeAllListeners('close');

      spawn.stdin.on('data', remoteDataPrinter('node', 'stdout'));
      spawn.stderr.on('data', remoteDataPrinter('node', 'stderr'));

      // TODO: Investigate if this *always* happens...
      running = new Promise(resolve => {
        spawn.on('finish', () => {
          running = undefined;
          resolve();
        });
      });
    } catch (e) {
      debug.error('Error running remote node', e);
    }
  }

  async function remoteExecYarn() {
    const execOptions: ExecOptions = {};

    const args: string[] = [];

    args.push('--cwd', remoteDaemonDir);

    args.push('install');
    args.push('--production');
    args.push('--non-interactive');
    args.push('--network-concurrency');
    args.push('1');
    args.push('--no-progress');

    try {
      const yarn: ClientChannel = await ssh.spawn('yarn', args, execOptions);

      // Remove verboseness from ssh.spawn
      yarn.removeAllListeners('finish');
      yarn.removeAllListeners('close');

      yarn.on('data', remoteDataPrinter('yarn', 'stdout'));
      yarn.stderr.on('data', remoteDataPrinter('yarn', 'stderr'));

      return new Promise(resolve => yarn.on('end', resolve));
    } catch (e) {
      debug.error('Error running remote yarn', e);
    }
  }

  combineLatest(packageUpdates, buildAndPush)
    // .pipe(map(() => debug.info('Build count:', buildingCount)))
    .pipe(filter(() => buildingCount == 0))
    .subscribe(
      remoteExecNode,
      e => {
        debug.error('Error in Observable:', e);
        ssh.close();
      },
      ssh.close
    );
}

function reportDiagnostic(diagnostic: ts.Diagnostic) {
  debug.error(
    'Error',
    diagnostic.code,
    ':',
    ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine())
  );
}

/**
 * Prints a diagnostic every time the watch status changes.
 * This is mainly for messages like "Starting compilation" or "Compilation completed".
 */
function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
  debug.info('TypeScript:', ts.formatDiagnostic(diagnostic, formatHost).trimRight());
}

if (require.main === module) {
  watchBuildTransferRun(config).then(null, e => debug.error('Main Failure:', e.toString()));
}

// TODO: Connect debugger/source maps to running node instance

// TODO: Handle user input. forward to remote. What about exit signal?
