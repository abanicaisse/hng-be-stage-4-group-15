import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export class PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  meta: PaginationMeta;

  constructor(data: T[], total: number, page: number, limit: number, message = 'Success') {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = {
      total,
      limit,
      page,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_previous: page > 1,
    };
  }
}
