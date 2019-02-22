#!/usr/bin/env node
import * as SSH from 'node-ssh';

import config from './config';

export type Options = {
  remote: {
    host: string;
    username: string;
    dir: string;
    agent?: string;
  };
};

export default async function watchBuildTransferRun(options: Options) {
  let sshPromise = new SSH().connect(options.remote);

  let sshConnection = await sshPromise;

  // Start Watching

  // Build outputs

  // Send outputs to remote

  // Rerun node

  try {
    await sshConnection.exec('node', ['.'], {
      cwd: options.remote.dir + '/daemon',
      onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
      onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
    });
  } catch (e) {
    console.log('Error running remote commands.', e);
  }

  sshConnection.dispose();
}

if (require.main === module) {
  watchBuildTransferRun(config).then(
    () => {},
    e => {
      console.log('TL Error:', e);
    }
  );
}
