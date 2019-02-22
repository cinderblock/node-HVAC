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

  const sftp = ssh.sftp();

  let pending = 0;

  async function setPendingRun() {
    pending++;
  }

  async function allowExec() {
    if (!--pending) remoteExecNode();
  }

  async function killRunning() {
    // TODO: implement
  }

  function localPathToRemote(local: string): string {
    // TODO: remove prefix from local

    return options.remote.dir + local;
  }

  watch(options.localPath + 'package.json')
    .on('change', async (eventType: 'change' | 'rename', filename: string) => {
      if (eventType == 'change') {
        setPendingRun();
        await sftp.fastPut(filename, options.remote.dir + '/package.json');
        await remoteExecYarn();
        allowExec();
      }
    })
    .on('error', err => {
      // TODO: Error handling
    })
    .on('close', () => {
      // TODO: Error handling
    });

  const host = ts.createWatchCompilerHost(
    configPath,
    {},
    ts.sys,
    ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    reportDiagnostic,
    reportWatchStatusChanged
  );

  const origCreateProgram = host.createProgram;
  host.createProgram = (rootNames: ReadonlyArray<string>, options, host, oldProgram) => {
    killRunning();
    setPendingRun();
    return origCreateProgram(rootNames, options, host, oldProgram);
  };

  const origPostProgramCreate = host.afterProgramCreate;
  host.afterProgramCreate = async program => {
    console.log('** We finished making the program! **');

    program.emit(undefined, (filename, source) => {
      const remoteFile = localPathToRemote(filename);

      sftp.writeFile(remoteFile, source, {});
    });

    allowExec();

    // TODO: Check if there is something that this was doing that we needed.
    // origPostProgramCreate(program);
  };

  ts.createWatchProgram(host);

  async function remoteExecNode() {
    try {
      return await ssh.exec('node', ['.'], {
        cwd: options.remote.dir,
        onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
        onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
      });
    } catch (e) {
      console.log('Error running remote node.', e);
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
      console.log('Error running remote yarn.', e);
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
