import { readFileSync, writeFileSync } from 'fs';

function isPidRunning(pid: number) {
  try {
    return process.kill(pid, 0);
  } catch (e) {
    return false;
  }
}

export default function runningProcessChecker(pidFile: string, ifRunningBehavior = 'kill') {
  // let i = 0;
  // let start = process.hrtime();

  try {
    const pid = +readFileSync(pidFile, 'utf8');

    if (pid && isPidRunning(pid)) {
      if (ifRunningBehavior == 'kill') {
        process.kill(pid);
        // while (isPidRunning(pid)) i++;
      } else if (ifRunningBehavior == 'die') {
        console.error('Process already running with pid:', pid);
        process.exit(1);
      }
    }
  } catch (e) {}

  // let checkTime = process.hrtime(start);

  // let killMillis = (checkTime[0] + checkTime[1] / 1e9) * 1e3;

  // console.log('Number of checks for dying process:', i);
  // console.log('Milliseconds it took to kill:', killMillis);

  writeFileSync(pidFile, process.pid, { mode: 0o664 });
}
