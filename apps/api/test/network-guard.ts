import * as net from 'net';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]', '::ffff:127.0.0.1']);
const INSTALLED = Symbol.for('curiousbees.networkGuard');

/**
 * Makes outbound connections to anything but this machine fail during tests.
 *
 * Every TCP/TLS client in Node (http, https, fetch, the AWS SDK, mail and
 * search clients) connects through net.Socket#connect, so refusing non-local
 * hosts there means a test can't send a real email, call a real API or use up
 * a quota, whatever credentials happen to be configured. Unix sockets and
 * loopback (the test database, the S3 emulator, supertest) are allowed.
 */
export function blockNonLocalConnections(): void {
  const proto = net.Socket.prototype as any;
  if (proto[INSTALLED]) return;
  const originalConnect = proto.connect;

  proto.connect = function guardedConnect(this: net.Socket, ...args: any[]) {
    // net.connect() passes its already-normalised [options, callback] array as the first argument.
    const first = Array.isArray(args[0]) ? args[0][0] : args[0];
    const options = first !== null && typeof first === 'object' ? first : { port: first, host: typeof args[1] === 'string' ? args[1] : undefined };
    if (!options.path) {
      const host = String(options.host ?? 'localhost').toLowerCase();
      if (!LOCAL_HOSTS.has(host)) {
        throw new Error(`Blocked an outbound connection to ${host}:${options.port}. Tests may only reach services on this machine.`);
      }
    }
    return originalConnect.apply(this, args);
  };
  proto[INSTALLED] = true;
}
