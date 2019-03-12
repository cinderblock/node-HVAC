# Node Server UI base

Skeleton for a sever/client JavaScript pair.

## Development

### Prerequisites

[**Node 10+**](https://nodejs.org/en/download) must be installed on your development system.

#### Non-global Yarn?

While easier if Yarn is installed globally, this works fine without it.

```bash
# Installs yarn locally
npm install
# Setup development environment
npm run setup
```

> You can run any command from the cheat sheet by replacing `yarn` with `npm run`.

### Running

To run this full system, **two** separate programs need to be run.
One for the web **UI** and one to actually do something persistent, the **daemon**.

Most commands are intended to be run **on your development machine** and **not** directly on the remote system.

### Suggested Environment

Use Visual Studio Code.

## Cheat sheet

All of these are run from the top level directory.

| Command                        | Description                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `yarn setup`                   | Setup your local machine for development                                              |
| `yarn ui start`                | Run the web **ui** on your local machine (_dev mode_)                                 |
| `yarn deploy development`      | Run local compiler in watch mode and **daemon** on remote with most recent local code |
| `yarn ui add some-package`     | Add `some-package` to the ui                                                          |
| `yarn ui upgrade`              | Upgrade ui packages to latest version                                                 |
| `yarn remote add some-package` | Add `some-package` to the daemon using the remote's yarn                              |
| `yarn remote upgrade`          | Upgrade daemon packages to latest version using the remote's yarn                     |
| `yarn remote kill`             | Kill the daemon on remote                                                             |
| `yarn remote shutdown`         | Shutdown the remote system                                                            |
| `yarn remote reboot`           | Reboot the remote system                                                              |
