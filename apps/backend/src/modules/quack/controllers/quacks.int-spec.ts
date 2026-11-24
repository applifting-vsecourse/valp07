import { PrismaService } from '@/core/prisma/prisma.service';
import {
  cleanDatabase,
  createIntegrationApp,
  signUpAndSignIn,
} from '@/test/integration-app';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('GET /api/quacks (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ctx = await createIntegrationApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when signed out', async () => {
    await request(app.getHttpServer()).get('/api/quacks').expect(401);
  });

  it('returns 200 when signed in', async () => {
    const agent = await signUpAndSignIn(app);

    const response = await agent.get('/api/quacks').expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
