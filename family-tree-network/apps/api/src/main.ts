import 'reflect-metadata';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`FAMILY TREE NETWORK API listening on http://localhost:${port}/api`);
}
bootstrap();
