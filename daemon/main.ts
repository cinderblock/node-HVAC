'use strict';

// Check if a previous version is running first and kill them if they still are.
import runningProcessChecker from './utils/runningProcessChecker';

runningProcessChecker('../daemon.pid', 'kill');

// Local dependencies
import debug from './utils/debug';
import makeClientHandler from './ClientHandler';

// Events from the clients and how to handle them
const remoteControlServer = makeClientHandler({
  // This event happens when mobile devices report their orientation data to the server.
  // This could be very useful as a remote.
  // Careful, this event happens at ~60Hz.
  deviceorientation: orientation => {
    // debug.log(orientation);
  },

  // Shut the whole thing down.
  Shutdown,
});

debug.green('Hello, world.');

function Shutdown() {
  setImmediate(() => {
    // Shutdown remote control server
    remoteControlServer.close();

    // Just kill the process in a short time in case we've forgotten to stop something...
    setTimeout(() => {
      debug.error('Something is still running...');
      debug.warn('Forcing a shutdown.');
      process.exit(0);
    }, 100).unref();
  });
}
