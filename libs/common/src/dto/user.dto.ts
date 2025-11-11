import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserPreference {
  @ApiProperty({ example: true, description: 'Enable email notifications' })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ example: true, description: 'Enable push notifications' })
  @IsBoolean()
  push: boolean;
}

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'device-token-123' })
  @IsOptional()
  @IsString()
  push_token?: string;

  @ApiProperty({ type: () => UserPreference })
  @ValidateNested()
  @Type(() => UserPreference)
  @IsObject()
  preferences: UserPreference;

  @ApiProperty({ example: 'SecurePass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'device-token-123' })
  @IsOptional()
  @IsString()
  push_token?: string;

  @ApiPropertyOptional({ type: () => UserPreference })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserPreference)
  @IsObject()
  preferences?: UserPreference;
}
