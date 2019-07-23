export default {
  remote: {
    connect: {
      username: 'pi',
      host: 'fannypi.tsl',
    },
    directory: 'hvac',
    serviceName: 'hvac',
  },
  local: {
    basePath: '../',
    moduleDir: 'daemon',
  },
};
