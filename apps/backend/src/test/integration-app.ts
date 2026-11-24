import { AppModule } from '@/app.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { toNodeHandler } from 'better-auth/node';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as request from 'supertest';
import TestAgent from 'supertest/lib/agent';

export interface IntegrationContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createIntegrationApp(): Promise<IntegrationContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());

  const appInstance = app.getHttpAdapter().getInstance();
  const betterAuth = app.get<BetterAuth>('BetterAuth');
  appInstance.all('/api/auth/*splat', toNodeHandler(betterAuth));
  appInstance.use(express.json());
  app.setGlobalPrefix('api');

  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "poll_vote", "poll_option", "poll", "quack", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;',
  );
}

export async function signUpAndSignIn(
  app: INestApplication,
  params: { email?: string; password?: string; name?: string } = {},
): Promise<TestAgent> {
  const email = params.email ?? 'testduck@example.com';
  const password = params.password ?? 'password123';
  const name = params.name ?? 'Test Duck';

  const agent = request.agent(app.getHttpServer());
  const res = await agent
    .post('/api/auth/sign-up/email')
    .send({ email, password, name });

  if (res.status !== 200) {
    throw new Error(
      `Failed to sign up test user (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  return agent;
}
