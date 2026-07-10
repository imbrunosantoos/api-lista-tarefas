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

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
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

      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`)
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
});
