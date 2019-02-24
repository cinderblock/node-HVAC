import SSH2Promise = require('ssh2-promise');

import config from './config';
import { ConnectOptions, ExecOptions } from './utils/ssh2.types';

export type Options = {
  remote: {
    connect: ConnectOptions;
    directory?: string;
  };
  local?: { path?: string };
};

export default async function cleanRemote(options: Options) {
  if (!options.remote.directory) throw 'Refusing to clean default directory';

  const ssh = new SSH2Promise(options.remote.connect);

  await ssh.connect().catch((e: Error) => {
    console.log(e);
    throw 'Connection failed';
  });

  const execOptions: ExecOptions = {};

  await ssh.exec('rm', ['-rf', options.remote.directory], execOptions);

  return ssh.close();
}

if (require.main === module) cleanRemote(config).then(null, e => console.log('Error:', e));
