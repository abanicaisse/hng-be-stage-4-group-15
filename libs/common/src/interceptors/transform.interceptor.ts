import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../interfaces/response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already a SuccessResponse or ErrorResponse, return as is
        if (data?.success !== undefined) {
          return data;
        }

        // Transform plain data into SuccessResponse
        return new SuccessResponse(data);
      }),
    );
  }
}
