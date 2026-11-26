import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.factory';
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORD } from '../prisma/demo-data';
import { seedDemo, seedRelationshipTypes, wipe } from '../prisma/seed-lib';

export interface Ctx {
  app: INestApplication;
  prisma: PrismaClient;
  ids: Map<string, string>; // demo key -> profile id
  token: (key: string) => Promise<string>;
  api: (key: string | { token: string } | null) => {
    get: (url: string) => Promise<request.Response>;
    post: (url: string, body?: object) => Promise<request.Response>;
    patch: (url: string, body?: object) => Promise<request.Response>;
    put: (url: string, body?: object) => Promise<request.Response>;
    del: (url: string) => Promise<request.Response>;
  };
}

export async function setup(): Promise<Ctx> {
  const prisma = new PrismaClient();
  await wipe(prisma);
  await seedRelationshipTypes(prisma);
  const { profileIds } = await seedDemo(prisma, { bcryptRounds: 4 });
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(mod.createNestApplication());
  await app.init();
  const tokens = new Map<string, string>();
  const token = async (key: string) => {
    if (!tokens.has(key)) {
      const email = key.includes('@') ? key : `${key}@${DEMO_EMAIL_DOMAIN}`;
      const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: DEMO_PASSWORD });
      if (res.status !== 200) throw new Error(`login failed for ${key}: ${res.status}`);
      tokens.set(key, res.body.accessToken);
    }
    return tokens.get(key)!;
  };
  /** key = demo person key, { token } = raw access token, null = anonymous */
  const api = (key: string | { token: string } | null) => {
    const s = () => request(app.getHttpServer());
    const h = async (): Promise<Record<string, string>> =>
      key === null ? {} : { authorization: `Bearer ${typeof key === 'string' ? await token(key) : key.token}` };
    return {
      get: async (url: string) => s().get(url).set(await h()),
      post: async (url: string, body: object = {}) => s().post(url).set(await h()).send(body),
      patch: async (url: string, body: object = {}) => s().patch(url).set(await h()).send(body),
      put: async (url: string, body: object = {}) => s().put(url).set(await h()).send(body),
      del: async (url: string) => s().delete(url).set(await h()),
    };
  };
  return { app, prisma, ids: profileIds, token, api };
}

export async function teardown(ctx: Ctx) {
  await ctx.app.close();
  await ctx.prisma.$disconnect();
}

/** Registers a brand-new user (a stranger to the demo network). */
export async function register(ctx: Ctx, name: string) {
  const email = `${name.toLowerCase()}-${Date.now()}@example.test`;
  const res = await request(ctx.app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password: DEMO_PASSWORD, displayName: name, gender: 'UNSPECIFIED' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { email, token: res.body.accessToken as string, profileId: res.body.profileId as string };
}
