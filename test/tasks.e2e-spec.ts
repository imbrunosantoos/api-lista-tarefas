import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type AuthResponse = { accessToken: string };
type TaskResponse = { id: string; status: string };
type TaskListResponse = {
  data: TaskResponse[];
  meta: { total: number; page: number; limit: number };
};

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let otherUserToken: string;
  let taskId: string;

  const authHeader = () => `Bearer ${accessToken}`;

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

    const server = app.getHttpServer();

    await request(server).post('/auth/register').send({
      name: 'Tasks Owner',
      email: 'tasks-owner@example.com',
      password: 'secret123',
    });
    const ownerLogin = await request(server).post('/auth/login').send({
      email: 'tasks-owner@example.com',
      password: 'secret123',
    });
    accessToken = (ownerLogin.body as AuthResponse).accessToken;

    await request(server).post('/auth/register').send({
      name: 'Other User',
      email: 'tasks-other@example.com',
      password: 'secret123',
    });
    const otherLogin = await request(server).post('/auth/login').send({
      email: 'tasks-other@example.com',
      password: 'secret123',
    });
    otherUserToken = (otherLogin.body as AuthResponse).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to /tasks', () => {
    return request(app.getHttpServer()).get('/tasks').expect(401);
  });

  describe('POST /tasks', () => {
    it('creates a task with default PENDING status', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', authHeader())
        .send({ title: 'Buy groceries', description: 'Milk and eggs' })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Buy groceries',
        description: 'Milk and eggs',
        status: 'PENDING',
      });
      taskId = (response.body as TaskResponse).id;
    });

    it('rejects an empty title', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', authHeader())
        .send({ title: '' })
        .expect(400);
    });

    it('rejects an invalid status', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', authHeader())
        .send({ title: 'Task', status: 'NOT_A_STATUS' })
        .expect(400);
    });

    it('creates a task with priority and due date', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', authHeader())
        .send({
          title: 'Pay the bills',
          priority: 'HIGH',
          dueDate: '2026-08-01T12:00:00.000Z',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        priority: 'HIGH',
        dueDate: '2026-08-01T12:00:00.000Z',
      });

      const created = response.body as TaskResponse;
      await request(app.getHttpServer())
        .delete(`/tasks/${created.id}`)
        .set('Authorization', authHeader())
        .expect(204);
    });

    it('rejects an invalid priority', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', authHeader())
        .send({ title: 'Task', priority: 'URGENT' })
        .expect(400);
    });

    it('rejects an invalid due date', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', authHeader())
        .send({ title: 'Task', dueDate: 'tomorrow' })
        .expect(400);
    });
  });

  describe('GET /tasks', () => {
    it('lists the user tasks with pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', authHeader())
        .expect(200);

      const body = response.body as TaskListResponse;
      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('filters tasks by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .query({ status: 'DONE' })
        .set('Authorization', authHeader())
        .expect(200);

      expect((response.body as TaskListResponse).data).toHaveLength(0);
    });

    it('does not list tasks that belong to another user', async () => {
      const response = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect((response.body as TaskListResponse).data).toHaveLength(0);
    });
  });

  describe('GET /tasks/:id', () => {
    it('returns a task by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', authHeader())
        .expect(200);

      expect((response.body as TaskResponse).id).toBe(taskId);
    });

    it('returns 404 for a task owned by another user', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('updates the task status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', authHeader())
        .send({ status: 'DONE' })
        .expect(200);

      expect((response.body as TaskResponse).status).toBe('DONE');
    });

    it('returns 404 when updating a task owned by another user', () => {
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ status: 'PENDING' })
        .expect(404);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('returns 404 when deleting a task owned by another user', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);
    });

    it('deletes the task', () => {
      return request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', authHeader())
        .expect(204);
    });

    it('returns 404 after the task is deleted', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', authHeader())
        .expect(404);
    });
  });
});
