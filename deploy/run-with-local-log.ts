#!/usr/bin/env node
import { resolve } from 'path';

import wip = require('@cinderblock/node-git-wip');
import * as SSH from 'node-ssh';
import * as NodeGit from 'nodegit';

import config from './config';

const { remote } = config;

const remoteURL = `${remote.connection.username}@${remote.connection.host}:${remote.dir}`;

async function gitPush() {
  let repo = await NodeGit.Repository.open(resolve(__dirname, '..'));

  let wipResult = await wip({
    repo,
    prefix: 'deployed',
  });

  // console.log('WIP:', wipResult);

  let { branchNameShort: branch, branchName: branchFull, latestHash: hash, error, step: errorStep } = wipResult;

  if (error) {
    error.step = errorStep;
    throw error;
  }

  let remote = await NodeGit.Remote.createAnonymous(repo, remoteURL);

  let push = remote.push([`+refs/heads/${branch}:refs/heads/${branch}`], {
    callbacks: {
      credentials: (url, userName) => NodeGit.Cred.sshKeyFromAgent(userName),
    },
  });

  return {
    branchFull,
    push,
    hash,
  };
}

async function deploy() {
  const ssh = new SSH();

  let pushPromise = gitPush();

  let sshPromise = ssh.connect(remote);

  let push = await pushPromise;

  let branch = push.branchFull;
  let pushPresult = await push.push;

  if (pushPresult) {
    throw Error('Push failed: ' + pushPresult);
  }

  let sshConnection = await sshPromise;

  try {
    // Set branch to the one we just pushed
    let setHeadResult = await sshConnection.exec('git', ['symbolic-ref', 'HEAD', branch], {
      cwd: remote.dir,
      stream: 'stdout',
    });

    if (setHeadResult) {
      console.log('git set head result:', setHeadResult);
    }

    // Reset working tree to state in latest branch
    let resetResult = await sshConnection.exec('git', ['reset', '--hard'], {
      cwd: remote.dir,
      stream: 'stdout',
    });

    console.log('GIT WIP:', resetResult);

    await sshConnection.exec('node', ['.'], {
      cwd: remote.dir + '/daemon',
      onStdout: chunk => process.stdout.write(chunk.toString('utf8')),
      onStderr: chunk => process.stderr.write(chunk.toString('utf8')),
    });
  } catch (e) {
    console.log('Error running remote commands.', e);
  }

  sshConnection.dispose();
}

deploy().then(
  () => {},
  e => {
    console.log('TL Error:', e);
  }
);
