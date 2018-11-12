const fs = require('fs');

function isPidRunning(pid) {
  try {
    return process.kill(pid, 0);
  } catch (e) {
    return false;
  }
}

function runningProcessChecker(pidFile, ifRunningBehavior = 'kill') {
  let i = 0;
  let start = process.hrtime();

  try {
    const pid = fs.readFileSync(pidFile, 'utf8');

    if (isPidRunning(pid)) {
      if (ifRunningBehavior == 'kill') {
        process.kill(pid);
        while (isPidRunning(pid)) i++;
      } else if (ifRunningBehavior == 'die') {
        console.error('Process already running with pid:', pid);
        process.exit(1);
      }
    }
  } catch (e) {}

  let checkTime = process.hrtime(start);

  let killMillis = (checkTime[0] + checkTime[1] / 1e9) * 1e3;

  // console.log('Number of checks for dying process:', i);
  // console.log('Milliseconds it took to kill:', killMillis);

  fs.writeFileSync(pidFile, process.pid, { mode: 0o664 });
}

module.exports = runningProcessChecker;
