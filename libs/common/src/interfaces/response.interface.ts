import { PaginationMeta } from '../dto/pagination.dto';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  meta?: PaginationMeta;
}

export class SuccessResponse<T = any> implements ApiResponse<T> {
  success = true;
  data?: T;
  message: string;
  meta?: PaginationMeta;

  constructor(data?: T, message = 'Success', meta?: PaginationMeta) {
    this.data = data;
    this.message = message;
    this.meta = meta;
  }
}

export class ErrorResponse implements ApiResponse {
  success = false;
  error: string;
  message: string;

  constructor(message: string, error?: string) {
    this.message = message;
    this.error = error || message;
  }
}
