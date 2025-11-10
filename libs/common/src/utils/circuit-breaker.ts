import { Logger } from '@nestjs/common';
import { CircuitState, CircuitBreakerOptions } from '../interfaces/service.interface';

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private readonly logger = new Logger(CircuitBreaker.name);

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
      this.state = CircuitState.HALF_OPEN;
      this.logger.log(`Circuit breaker ${this.name} entering HALF_OPEN state`);
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.options.timeout),
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.threshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        this.logger.log(`Circuit breaker ${this.name} is now CLOSED`);
      }
    }
  }
  private onFailure() {
    this.failureCount++;
    this.successCount = 0;
    if (this.failureCount >= this.options.threshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      this.logger.error(
        `Circuit breaker ${this.name} is now OPEN until ${new Date(this.nextAttempt).toISOString()}`,
      );
    }
  }
  getState(): CircuitState {
    return this.state;
  }
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.logger.log(`Circuit breaker ${this.name} has been reset`);
  }
}
