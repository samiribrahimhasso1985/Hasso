import 'reflect-metadata';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 4000);
  // HOST limits the network interface (EZIDINET Desktop uses 127.0.0.1); unset = all interfaces as before.
  const host = process.env.HOST;
  await (host ? app.listen(port, host) : app.listen(port));
  // eslint-disable-next-line no-console
  console.log(`FAMILY TREE NETWORK API listening on http://localhost:${port}/api`);
}
bootstrap();
