import io = require('socket.io-client');

// config
const socketURL = undefined;

const socket = io(socketURL, {
  transports: ['websocket'],
});

export default socket;

socket.on('error', console.log.bind(0, 'Error:'));

export const Store: { startuptime?: Date } = {};

socket.on('startuptime', u => (Store.startuptime = new Date(u)));

window.addEventListener('deviceorientation', ({ alpha, beta, gamma }) => {
  if (alpha === null) return;

  socket.emit('event', { name: 'deviceorientation', value: { alpha, beta, gamma } });
});

const eventHandlers = {};

// caches event handlers
export function eventHandler(name, log = true) {
  if (eventHandlers[name]) return eventHandlers[name];

  return (eventHandlers[name] = value => {
    if (typeof value != 'number' && typeof value != 'string' && value) {
      value = value.target.value;
    }

    socket.emit('event', {
      name,
      value,
      log,
    });

    console.log('Event:', name, '->', value === undefined ? 'value undefined' : value);
  });
}
