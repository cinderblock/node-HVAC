// Check if a previous version is running first and kill them if they still are.
require('./utils/runningProcessChecker.js')('../daemon.pid', 'kill');

// Local dependencies
const debug = require('./utils/debug.js');
const makeClientHandler = require('./ClientHandler.js');

// Events from the clients and how to handle them
const remoteControlServer = makeClientHandler({
  // This event happens when mobile devices report their orientation data to the server.
  // This could be very useful as a remote.
  // Careful, this event happens at ~60Hz.
  deviceorientation: orientation => {
    // debug.log(orientation);
  },

  Shutdown,

  // More event handlers
});

debug.green('Hello, world.');

function Shutdown() {
  setImmediate(() => {
    // Shutdown remote control server
    remoteControlServer.close();

    // Just kill the process in a short time in case we've forgotten to stop something...
    setTimeout(() => {
      console.log('Something is still running...');
      console.log('Forcing a shutdown.');
      process.exit(0);
    }, 100).unref();
  });
}
