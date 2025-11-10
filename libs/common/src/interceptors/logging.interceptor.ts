import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);
    if (Object.keys(body || {}).length > 0) {
      this.logger.debug(`Request body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(`← ${method} ${url} ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(`← ${method} ${url} ${duration}ms - Error: ${error.message}`);
        },
      }),
    );
  }
}
