#!/usr/bin/env node
import SSH2Promise = require('ssh2-promise');
import ts = require('typescript');
import { Observable, combineLatest, merge } from 'rxjs';
import { debounceTime, map, filter, mergeMap } from 'rxjs/operators';

import observeFileChange from './utils/observeFile';
import config from './config';
import forEachPromise from './utils/forEachPromise';
import { ClientChannel, ExecOptions } from 'ssh2';
import { ConnectOptions } from './utils/ssh2.types';

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

  options.remote.connect.reconnectDelay = options.remote.connect.reconnectDelay || 250;
  options.remote.connect.reconnect = false;

  // options.remote.connect.debug = msg => console.log('SSH DEBUG:', msg);

  const ssh = new SSH2Promise(options.remote.connect);

  await ssh.connect().catch((e: Error) => {
    console.log(e);
    throw 'Connection failed';
  });

  const sftp = ssh.sftp();

  async function mkdir(dir: string, recursive = false) {
    const execOptions: ExecOptions = {};
    const args: string[] = [];

    if (recursive) args.push('-p');
    args.push(dir);

    return ssh.exec('mkdir', args, execOptions);
  }

  if (options.remote.directory) await mkdir(options.remote.directory, true);

  async function updatePackages() {
    const remotePath = options.remote.directory ? options.remote.directory + '/' : '';
    console.log('Updating package.json and yarn.lock');

    await Promise.all([
      sftp.fastPut(options.local.path + 'package.json', remotePath + 'package.json'),
      sftp.fastPut(options.local.path + 'yarn.lock', remotePath + 'yarn.lock'),
    ]).catch(e => {
      console.log('Error putting files:', e);
    });

    console.log('Updated package.json and yarn.lock');

    await remoteExecYarn();

    console.log('Yarn ran');
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
    .pipe(map(() => console.log('Packages updated')));

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
      console.log('Starting new compilation');
      markBuilding();
      // Might be nice to wait for it to finish... Not sure how.
      killRunning();
      return origCreateProgram(rootNames, options, host, oldProgram);
    };

    const origPostProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = async program => {
      console.log('** We finished making the program! **');

      const data: [string, string][] = [];

      program.emit(undefined, (filename, source) => data.push([filename, source]));

      const dirs = data
        // Strip filenames
        .map(([filename]) => filename.replace(/\/[^/]*$/, ''))
        // non-empty and Unique
        .filter((value, i, arr) => value && arr.indexOf(value) === i)
        // Filter to only needed mkdirs, keep if we don't find any others that would make the current dir
        .filter((value, i, arr) => !arr.find((other, j) => i !== j && other.startsWith(value)));

      // Directory creation must be sequential
      await forEachPromise(dirs, mkdir);

      await Promise.all(data.map(([file, data]) => sftp.writeFile(file, data, {})));

      observable.next();

      // TODO: Check if there is something that this was doing that we needed.
      // origPostProgramCreate(program);
    };

    ts.createWatchProgram(host);

    // TODO: return teardown logic
  })
    .pipe(map(doneBuilding))
    .pipe(map(() => console.log('Sources updated')));

  let running: Promise<void>;
  let spawn: ClientChannel;

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
      console.log('Signaling');
      // TODO: Test this...
      spawn.signal(signal);
      spawn = undefined;
    }

    return running;
  }

  async function remoteExecNode() {
    console.log('Running');

    // This means we messed up...
    if (running) throw 'Already running!';

    const execOptions: ExecOptions = {};

    try {
      spawn = await ssh.spawn('node', [options.remote.directory || '.'], execOptions);

      spawn.on('data', (data: Buffer) => {
        console.log('Node:', data.toString().trimRight());
      });

      spawn.stderr.on('data', (data: Buffer) => {
        console.log('Node stderr:', data.toString().trimRight());
      });

      running = new Promise(resolve => {
        spawn.on('close', () => {
          running = undefined;
          resolve();
        });
      });
    } catch (e) {
      console.log('Error running remote node.', e.toString('utf8'));
    }
  }

  async function remoteExecYarn() {
    const execOptions: ExecOptions = {};

    const args: string[] = [];

    if (options.remote.directory) args.push('--cwd', options.remote.directory);

    args.push('install');
    args.push('--production');
    args.push('--non-interactive');

    try {
      const yarn: ClientChannel = await ssh.spawn('yarn', args, execOptions);

      yarn.on('data', (data: Buffer) => {
        console.log('Yarn:', data.toString().trimRight());
      });

      yarn.stderr.on('data', (data: Buffer) => {
        console.log('Yarn stderr:', data.toString().trimRight());
      });

      return new Promise(resolve => yarn.on('end', resolve));
    } catch (e) {
      console.log('Error running remote yarn.', e.toString('utf8'));
    }
  }

  combineLatest(packageUpdates, buildAndPush)
    // .pipe(map(() => console.log('Build count:', buildingCount)))
    .pipe(filter(() => buildingCount == 0))
    .subscribe(
      remoteExecNode,
      e => {
        console.log('Error in Observable:', e);
        ssh.close();
      },
      ssh.close
    );
}

function reportDiagnostic(diagnostic: ts.Diagnostic) {
  console.error(
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
  console.info('TypeScript:', ts.formatDiagnostic(diagnostic, formatHost).trimRight());
}

if (require.main === module) {
  watchBuildTransferRun(config).then(
    () => {},
    e => {
      console.log('Error:', e);
    }
  );
}

// TODO: Connect debugger/source maps to running node instance

// TODO: Handle user input. forward to remote. What about exit signal?
