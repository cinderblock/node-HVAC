'use strict';

import * as Koa from 'koa';
import * as Router from 'koa-router';

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
let override: boolean;

const app = new Koa();
const router = new Router();

router.get('/on', async ctx => {
  override = true;
  ctx.body = '<html><body>Forcing fan <strong>on</strong> <i>until next program command</i></body></html>';
});

router.get('/off', async ctx => {
  override = false;
  ctx.body = '<html><body>Forcing fan <strong>off</strong> <i>until next program command</i></body></html>';
});

app.use(router.routes());

app.listen(80);

setInterval(async () => {
  const time = getTime();
  // console.log(time, nightEnd, nightStart, time < nightEnd, time > nightStart);

  const program = time < nightEnd || time > nightStart;

  if (override === undefined) fanOn = program;
  else fanOn = override;

  if (lastFanOn !== fanOn) {
    console.log('Turning fan:', fanOn ? 'on' : 'off');

    if (program === override) override = undefined;

    fan.digitalWrite(fanOn ? 1 : 0);

    lastFanOn = fanOn;
  }
}, 10 * 1000);
