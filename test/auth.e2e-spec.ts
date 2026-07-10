import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const user = {
    name: 'Auth Test User',
    email: 'auth-e2e@example.com',
    password: 'secret123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('registers a new user without exposing the password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      expect(response.body).toMatchObject({
        name: user.name,
        email: user.email,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('password');
    });

    it('rejects a duplicated email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(409);
    });

    it('rejects an invalid payload', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: '', email: 'not-an-email', password: '123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns an access token for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const body = response.body as {
        accessToken: string;
        refreshToken: string;
      };
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
    });

    it('rejects invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('GET /users/me', () => {
    it('returns the authenticated user profile', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
      const { accessToken } = login.body as { accessToken: string };

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        name: user.name,
        email: user.email,
      });
    });

    it('rejects requests without a token', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    type TokenPair = { accessToken: string; refreshToken: string };

    const login = async (): Promise<TokenPair> => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
      return response.body as TokenPair;
    };

    it('exchanges a refresh token for a new pair', async () => {
      const { refreshToken } = await login();

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const body = response.body as TokenPair;
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it('rejects a refresh token that was already used (rotation)', async () => {
      const { refreshToken } = await login();

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('rejects a made-up refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });

    it('rejects a refresh token after logout', async () => {
      const { refreshToken } = await login();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(204);

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
