import * as React from 'react';

import { Button, ButtonGroup } from 'reactstrap';

// Fix React ES6 class issues
import * as reactAutoBind from 'react-autobind';

import SocketConnection, { eventHandler } from './SocketConnection';

class AppContainer extends React.PureComponent {
  constructor(props) {
    super(props);
    reactAutoBind(this);
  }

  componentDidMount() {
    // SocketConnection.on('update', ({ status: { running } }) => this.setState({ running }));
  }

  render() {
    return (
      <>
        <Button onClick={eventHandler('hello')}>Hello world!</Button>
      </>
    );
  }
}

export default AppContainer;
