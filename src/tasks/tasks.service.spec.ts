import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  const prisma = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const userId = 'user-1';
  const task = {
    id: 'task-1',
    title: 'Buy groceries',
    description: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: null,
    userId,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(TasksService);
  });

  describe('create', () => {
    it('applies default status and priority', async () => {
      prisma.task.create.mockResolvedValue(task);

      await service.create(userId, { title: 'Buy groceries' });

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Buy groceries',
          description: undefined,
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: null,
          userId,
        },
      });
    });

    it('converts the due date string to a Date', async () => {
      prisma.task.create.mockResolvedValue(task);

      await service.create(userId, {
        title: 'Pay bills',
        dueDate: '2026-08-01T12:00:00.000Z',
      });

      const [firstCall] = prisma.task.create.mock.calls as [
        [{ data: { dueDate: Date } }],
      ];
      const [args] = firstCall;
      expect(args.data.dueDate).toEqual(new Date('2026-08-01T12:00:00.000Z'));
    });
  });

  describe('findAll', () => {
    it('scopes the query to the user and returns pagination meta', async () => {
      prisma.$transaction.mockResolvedValue([[task], 1]);

      const result = await service.findAll(userId, { page: 1, limit: 10 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('applies status, priority and search filters', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(userId, {
        status: 'DONE',
        priority: 'HIGH',
        search: 'groceries',
      } as Parameters<TasksService['findAll']>[1]);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            status: 'DONE',
            priority: 'HIGH',
            title: { contains: 'groceries' },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the task when it belongs to the user', async () => {
      prisma.task.findFirst.mockResolvedValue(task);

      await expect(service.findOne(userId, task.id)).resolves.toEqual(task);
      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: task.id, userId },
      });
    });

    it('throws not found for a task of another user', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, task.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('checks ownership before updating', async () => {
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.task.update.mockResolvedValue({ ...task, status: 'DONE' });

      const result = await service.update(userId, task.id, {
        status: 'DONE',
      } as Parameters<TasksService['update']>[2]);

      expect(result.status).toBe('DONE');
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: task.id },
        data: { status: 'DONE' },
      });
    });

    it('allows clearing the due date with null', async () => {
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.task.update.mockResolvedValue(task);

      await service.update(userId, task.id, {
        dueDate: null,
      } as unknown as Parameters<TasksService['update']>[2]);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: task.id },
        data: { dueDate: null },
      });
    });
  });

  describe('remove', () => {
    it('checks ownership before deleting', async () => {
      prisma.task.findFirst.mockResolvedValue(task);
      prisma.task.delete.mockResolvedValue(task);

      await service.remove(userId, task.id);

      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: task.id },
      });
    });

    it('throws not found instead of deleting another user task', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, task.id)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.task.delete).not.toHaveBeenCalled();
    });
  });
});
