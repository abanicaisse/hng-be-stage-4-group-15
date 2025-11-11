import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if it's a public route
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No authentication token provided');
      throw new UnauthorizedException('Authentication token is required');
    }

    // TODO: Implement JWT validation => User Service to validate token and attach user to request
    // For now, just check if token exists
    try {
      // Mock user extraction
      const userId = 'mock-user-id'; // Extract from JWT
      request.user = { id: userId };
      return true;
    } catch (error) {
      this.logger.error('Token validation failed:', error);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
