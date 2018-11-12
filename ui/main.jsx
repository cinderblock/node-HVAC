import React from 'react';
import ReactDOM from 'react-dom';

import AppContainer from './AppContainer.jsx';
import { eventHandler } from './SocketConnection.js';

import './style.css';

ReactDOM.render(<AppContainer />, document.body.appendChild(document.createElement('div')));

document.addEventListener(
  'keydown',
  event => {
    if (event.code == 'F12') {
      // Open developer console
      return;
    }

    if (event.code == 'Escape') {
      event.preventDefault();
      eventHandler('stopRunning')();
      return;
    }

    if (event.code == 'KeyS') {
      event.preventDefault();
      eventHandler('stopRunning')();
      return;
    }

    if (event.code == 'Space') {
      event.preventDefault();
      return;
    }

    console.log('No handler for:', event);
  },
  false
);
