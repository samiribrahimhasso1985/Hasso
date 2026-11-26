import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ErrorsFilter } from './common/errors.filter';

export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','), credentials: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ErrorsFilter());
  return app;
}

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  return configureApp(app);
}
