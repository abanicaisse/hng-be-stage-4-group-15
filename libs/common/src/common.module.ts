import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './utils/idempotency.util';

@Global()
@Module({
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class CommonModule {}
