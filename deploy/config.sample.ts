export default {
  remote: {
    connect: {
      username: 'user',
      host: 'some.host',
      // agent: 'pageant',
      // privateKey: 'Full key',
    },
    directory: 'deploy',
  },
  local: {
    basePath: '../',
    moduleDir: 'daemon',
  },
};
