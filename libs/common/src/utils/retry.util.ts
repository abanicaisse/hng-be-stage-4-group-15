import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class RetryUtil {
  private static readonly logger = new Logger(RetryUtil.name);

  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    context = 'operation',
  ): Promise<T> {
    let lastError: Error;
    let delay = options.initialDelay;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        this.logger.debug(`${context}: Attempt ${attempt}/${options.maxAttempts}`);
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${context}: Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < options.maxAttempts) {
          this.logger.debug(`${context}: Retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
        }
      }
    }

    this.logger.error(`${context}: All ${options.maxAttempts} attempts failed`);
    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
