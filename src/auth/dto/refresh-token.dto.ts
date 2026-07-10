import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'f3a1c2...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
