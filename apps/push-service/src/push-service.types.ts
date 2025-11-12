// apps/push-service/src/push-service.types.ts
export interface Push {
  id: number;
  to: string;
  message: string;
  status: 'QUEUED' | 'DELIVERED' | 'FAILED';
  createdAt: string;
  deliveredAt?: string; // optional, set later
  failedAt?: string;    // optional, in case of failure
  errorMessage?: string;
}
