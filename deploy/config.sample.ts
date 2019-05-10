export default {
  remote: {
    connect: {
      username: 'user',
      host: 'some.host',
      // agent: 'pageant',
      // privateKey: 'Full key',
    },
    directory: 'deploy',
    serviceName: 'node-server-ui-base',
  },
  local: {
    basePath: '../',
    moduleDir: 'daemon',
  },
};
