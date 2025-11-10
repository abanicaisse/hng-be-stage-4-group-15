import { IsEmail, IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserPreference {
  @ApiProperty()
  @IsBoolean()
  email: boolean;

  @ApiProperty()
  @IsBoolean()
  push: boolean;
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  push_token?: string;

  @ApiProperty({ type: () => UserPreference })
  preferences: UserPreference;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  push_token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  preferences?: UserPreference;
}
