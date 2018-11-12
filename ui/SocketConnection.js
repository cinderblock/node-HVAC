import io from 'socket.io-client';

// config
const socketURL = undefined;

const socket = io(socketURL, {
  transports: ['websocket'],
});

socket.on('error', console.log.bind(0, 'Error:'));

const Store = {};

socket.on('startuptime', u => (Store.startuptime = u));

window.addEventListener('deviceorientation', ({ alpha, beta, gamma }) => {
  if (alpha === null) return;

  socket.emit('event', { name: 'deviceorientation', value: { alpha, beta, gamma } });
});

const eventHandlers = {};

// caches event handlers
function eventHandler(name, log = true) {
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

export { socket as default, eventHandler, Store };
