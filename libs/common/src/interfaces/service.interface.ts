export interface HealthCheckResult {
  status: 'up' | 'down';
  timestamp: Date;
  service: string;
  version: string;
  dependencies?: {
    database?: 'connected' | 'disconnected';
    queue?: 'connected' | 'disconnected';
    cache?: 'connected' | 'disconnected';
  };
}

export interface CircuitBreakerOptions {
  threshold: number;
  timeout: number;
  resetTimeout: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}
