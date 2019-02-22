#!/usr/bin/env node
import SSH2Promise = require('ssh2-promise');
import ts = require('typescript');

import config from './config';
import { watch, WriteStream } from 'fs';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};

export type Options = {
  remote: {
    host: string;
    username: string;
    dir: string;
    agent?: string;
  };
  localPath?: string;
};

export default async function watchBuildTransferRun(options: Options) {
  options.localPath = options.localPath || '../daemon/';

  const configPath = ts.findConfigFile(options.localPath, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  const ssh = new SSH2Promise(options.remote);

  await ssh.connect();

  let sftp = ssh.sftp();

  async function mkdir(dir: string) {
    await sftp.mkdir(dir).catch(async e => {
      console.log('Directory already exists?');

      await ssh.connect();
      sftp = ssh.sftp();
    });
  }

  // mkdir(options.remote.dir);

  async function updatePackageJson() {
    console.log('Updating package.json');
    console.log('Putting:', options.localPath + 'package.json', options.remote.dir + '/package.json');
    await sftp.fastPut(options.localPath + 'package.json', options.remote.dir);
    console.log('Updated package.json');
    await sftp.fastPut(options.localPath + 'yarn.lock', options.remote.dir + '/yarn.lock');
    console.log('Updated yarn.lock');
    await remoteExecYarn();
    console.log('Yarn ran');
  }

  await updatePackageJson();

  watch(options.localPath + 'package.json')
    .on('change', async (eventType: 'change' | 'rename', filename: string) => {
      if (eventType == 'change') updatePackageJson();
      console.log('Change event:', eventType, filename);
    })
    .on('error', err => {
      // TODO: Error handling
      console.log('Watch error');
    })
    .on('close', () => {
      // TODO: Error handling
      console.log('Watch close');
    });

  const host = ts.createWatchCompilerHost(
    configPath,
    { outDir: options.remote.dir },
    ts.sys,
    ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    reportDiagnostic,
    reportWatchStatusChanged
  );

  const origCreateProgram = host.createProgram;
  host.createProgram = (rootNames: ReadonlyArray<string>, options, host, oldProgram) => {
    console.log('Starting new compilation');
    killRunning();
    return origCreateProgram(rootNames, options, host, oldProgram);
  };

  const origPostProgramCreate = host.afterProgramCreate;
  host.afterProgramCreate = async program => {
    console.log('** We finished making the program! **');

    const files: [string, string][] = [];

    program.emit(undefined, (filename, source) => {
      files.push([filename, source]);
    });

    for (let i = 0; i < files.length; i++) {
      const [filename, source] = files[i];
      await sftp.writeFile(filename, source, {});
      console.log('Wrote:', filename);
    }

    remoteExecNode();

    // TODO: Check if there is something that this was doing that we needed.
    // origPostProgramCreate(program);
  };

  ts.createWatchProgram(host);

  let running;

  async function killRunning() {}

  async function remoteExecNode() {
    console.log('Running');
    try {
      return await ssh.exec('node', ['.'], {
        cwd: options.remote.dir,
        onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
        onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
      });
    } catch (e) {
      console.log('Error running remote node.', e.toString('uft8'));
    }
  }

  async function remoteExecYarn() {
    try {
      return await ssh.exec('yarn', [], {
        cwd: options.remote.dir,
        onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
        onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
      });
    } catch (e) {
      console.log('Error running remote yarn.', e.toString('uft8'));
    }
  }

  ssh.close();
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
  console.info(ts.formatDiagnostic(diagnostic, formatHost));
}

if (require.main === module) {
  watchBuildTransferRun(config).then(
    () => {},
    e => {
      console.log('TL Error:', e);
    }
  );
}
