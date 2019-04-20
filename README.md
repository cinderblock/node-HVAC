# Node HVAC

Simple Node.js based node for controlling/sensing part of a DIY HVAC system.

## Development

### Prerequisites

[**Node 10+**](https://nodejs.org/en/download) must be installed on your development system.
[**Yarn**](https://yarnpkg.com/lang/en/docs/install) is nice to have but **optional**.

### Setup

Install dependencies and setup development environment.

```bash
yarn setup
```

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

#### Local Daemon Config

If you'd like to run the daemon locally, there are a couple steps that need to be taken:

1. Copy `daemon/config.sample.ts` to `daemon/config.ts`.
2. Edit as desired. Directories must exist.

### Suggested Environment

Use Visual Studio Code.

## Cheat sheet

All of these are run from the top level directory.

| Command                        | Description                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `yarn setup`                   | Setup your local machine for development                                              |
| `yarn ui dev`                  | Run the web **ui** on your local machine (_dev mode_)                                 |
| `yarn daemon dev`              | Run **daemon** locally in watch mode with most recent local code                      |
| `yarn deploy daemon-dev`       | Run local compiler in watch mode and **daemon** on remote with most recent local code |
| `yarn ui add some-package`     | Add `some-package` to the ui                                                          |
| `yarn ui upgrade`              | Upgrade ui packages to latest versions                                                |
| `yarn upgrade-all`             | Upgrade all packages to latest versions                                               |
| `yarn remote add some-package` | Add `some-package` to the daemon using the remote's yarn                              |
| `yarn remote upgrade`          | Upgrade daemon packages to latest version using the remote's yarn                     |
| `yarn remote kill`             | Kill the daemon on remote                                                             |
| `yarn remote shutdown`         | Shutdown the remote system                                                            |
| `yarn remote reboot`           | Reboot the remote system                                                              |
