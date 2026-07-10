import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
    });

    return this.toSafeUser(user);
  }

  private toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
