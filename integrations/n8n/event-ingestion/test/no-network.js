// Loaded before the tests (see package.json): any connection that leaves this
// machine fails, so a test can never call Gemini, Gmail or CuriousBees for real.
const net = require('net');

const LOCAL = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = first !== null && typeof first === 'object' ? first : { port: first, host: typeof args[1] === 'string' ? args[1] : undefined };
  if (!options.path && !LOCAL.has(String(options.host ?? 'localhost').toLowerCase())) {
    throw new Error(`Blocked an outbound connection to ${options.host}:${options.port} during tests.`);
  }
  return connect.apply(this, args);
};
