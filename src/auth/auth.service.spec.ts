import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
  };

  const prisma = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const configService = {
    get: jest.fn().mockReturnValue('7'),
  };

  const user = {
    id: 'user-1',
    name: 'Bruno',
    email: 'bruno@example.com',
    password: 'hashed-password',
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and returns the user without it', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(
        (data: { name: string; email: string; password: string }) =>
          Promise.resolve({ ...user, ...data }),
      );

      const result = await service.register({
        name: 'Bruno',
        email: 'bruno@example.com',
        password: 'secret123',
      });

      const [firstCall] = usersService.create.mock.calls as [
        [{ password: string }],
      ];
      const [createArgs] = firstCall;
      expect(createArgs.password).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', createArgs.password)).toBe(true);
      expect(result).not.toHaveProperty('password');
    });

    it('throws a conflict for a duplicated email', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.register({
          name: 'Bruno',
          email: 'bruno@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token pair for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secret123', 4);
      usersService.findByEmail.mockResolvedValue({
        ...user,
        password: passwordHash,
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: user.email,
        password: 'secret123',
      });

      expect(result.accessToken).toBe('signed-jwt');
      expect(typeof result.refreshToken).toBe('string');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'secret123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('secret123', 4);
      usersService.findByEmail.mockResolvedValue({
        ...user,
        password: passwordHash,
      });

      await expect(
        service.login({ email: user.email, password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const storedToken = {
      id: 'token-1',
      tokenHash: 'hash',
      userId: user.id,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };

    it('revokes the presented token and issues a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      usersService.findById.mockResolvedValue(user);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('raw-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(result.accessToken).toBe('signed-jwt');
    });

    it('rejects an unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('nope')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a revoked token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revokes an active token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        revokedAt: null,
      });
      prisma.refreshToken.update.mockResolvedValue({});

      await service.logout('raw-token');

      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });

    it('does nothing for an unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await service.logout('nope');

      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });
});
