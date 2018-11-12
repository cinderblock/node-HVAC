// Check if a previous version is running first, and kill them if they still are.
require('./utils/runningProcessChecker.js')('../daemon.pid', 'kill');

// Local dependencies
const debug = require('./utils/debug.js');
const clientUI = require('./ClientUIHandler.js');

// Events from the UI and how to handle them
const remoteControlServer = clientUI({
  // This event happens when mobile devices report their orientation data to the
  // server.
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
  // Shutdown remote control server
  remoteControlServer.close();

  // Just kill the process in a short time since we're not great at stopping all
  // running events
  setTimeout(() => {
    process.exit(0);
  }, 100);
}
