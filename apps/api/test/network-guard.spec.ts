import * as http from 'http';
import { AddressInfo } from 'net';
import * as net from 'net';
import { blockNonLocalConnections } from './network-guard';

describe('blockNonLocalConnections', () => {
  beforeAll(() => blockNonLocalConnections());

  it('refuses a raw connection to another machine before any packet is sent', () => {
    expect(() => net.connect({ host: 'example.com', port: 443 })).toThrow(/Blocked an outbound connection to example.com:443/);
    expect(() => net.connect(587, 'mail.example.com')).toThrow(/Blocked/);
  });

  it('makes fetch to an external API fail', async () => {
    await expect(fetch('https://api.example.com/v3/send', { method: 'POST' })).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/Blocked an outbound connection to api\.example\.com/) }),
    });
  });

  it('still allows services on this machine', async () => {
    const server = http.createServer((_req, res) => res.end('ok'));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const { port } = server.address() as AddressInfo;
      const res = await fetch(`http://127.0.0.1:${port}/`);
      expect(await res.text()).toBe('ok');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
