import { ConnectConfig } from 'ssh2';

export type ConnectOptions = ConnectConfig & {
  // Added by SSH2-Promise

  // to directly pass the path of private key file.
  identity?: string;
  // to reconnect automatically, once disconnected. Default: 'true'.
  reconnect?: boolean;
  // Number of reconnect tries. Default: '10'.
  reconnectTries?: number;
  // Delay after which reconnect should be done. Default: '5000'.
  reconnectDelay?: number;
};
