# Party-Lights

Web UI to control ESP-Lights

## Development

### Prerequisites

[**Node 8+**](https://nodejs.org/en/download) must be installed on your development system.

```bash
npm install
```

### Running

To run this full system, **two** separate programs need to be run.
One for the **web UI** and one to actually do something presistent, the **daemon**.

Most commands are intended to be run **on your development machine** and **not** directly on the remote system.

## Cheatsheet

All of these are run from the top level directory.

| Command                        | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `yarn`                         | Setup your local machine for development                    |
| `yarn ui setup start`       | Run the **webui** in development mode on your local machine |
| `yarn deploy setup daemon`     | Run **daemon** on remote with most recent local code        |
| `yarn ui add some-package`     | Add `some-package` to the webui                             |
| `yarn ui upgrade`              | Upgrade ui packages to latest version                       |
| `yarn remote add some-package` | Add `some-package` to the daemon using the remote's yarn               |
| `yarn remote upgrade`          | Upgrade daemon packages to latest version using the remote's yarn       |
| `yarn remote kill`             | Kill the daemon on remote                                   |
| `yarn remote shutdown`         | Shutdown the remote system                            |
| `yarn remote reboot`           | Reboot the remote system                              |
