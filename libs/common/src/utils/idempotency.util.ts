import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly processedRequests = new Map<string, any>();
  private readonly ttl = 3600000; // 1 hour

  async checkAndStore(
    requestId: string,
    result?: any,
  ): Promise<{ isProcessed: boolean; result?: any }> {
    const cached = this.processedRequests.get(requestId);

    if (cached) {
      this.logger.log(`Request ${requestId} already processed (idempotent)`);
      return { isProcessed: true, result: cached.result };
    }

    if (result !== undefined) {
      this.processedRequests.set(requestId, {
        result,
        timestamp: Date.now(),
      });

      // Clean up old entries
      this.cleanup();
    }

    return { isProcessed: false };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.processedRequests.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.processedRequests.delete(key);
      }
    }
  }
}
