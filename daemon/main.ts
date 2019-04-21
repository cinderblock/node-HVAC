'use strict';

// Check if a previous version is running first and kill them if they still are.
import runningProcessChecker from './utils/runningProcessChecker';

runningProcessChecker('./daemon.pid', 'kill');

// Local dependencies
import * as debug from './utils/debug';
import makeClientHandler from './ClientHandler';

import { Gpio } from 'pigpio';

// Events from the clients and how to handle them
const remoteControlServer = makeClientHandler({});

debug.green('Hello, world.');

const fan = new Gpio(17, { mode: Gpio.OUTPUT });

/**
 * Extract just the time component, in local timezone, in 24-hour format, from a Date
 */
function getTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

var nightEnd = '07:30:00';
var nightStart = '20:00:00';

let fanOn = false;
let lastFanOn: boolean;

setInterval(async () => {
  const time = getTime();
  // console.log(time, nightEnd, nightStart, time < nightEnd, time > nightStart);

  if (time < nightEnd || time > nightStart) {
    fanOn = true;
  } else {
    fanOn = false;
  }

  if (lastFanOn !== fanOn) {
    console.log('Turning fan:', fanOn ? 'on' : 'off');

    fan.digitalWrite(fanOn ? 1 : 0);

    lastFanOn = fanOn;
  }
}, 10 * 1000);
