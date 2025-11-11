import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { DatabaseService } from '@app/database';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userServiceUrl: string;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl =
      this.configService.get<string>('services.userService') || 'http://localhost:3001';
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.databaseService.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.warn(`Login attempt for non-existent user: ${email}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        this.logger.warn(`Invalid password attempt for user: ${email}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      this.logger.log(`User validated successfully: ${email}`);

      const { password_hash, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error validating user:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: '24h',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async register(email: string, password: string, name: string) {
    try {
      const existingUser = await this.databaseService.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(`Registration attempt for existing email: ${email}`);
        throw new BadRequestException('User with this email already exists');
      }

      const password_hash = await bcrypt.hash(password, 10);

      // Create user via User Service
      const response = await firstValueFrom(
        this.httpService.post(`${this.userServiceUrl}/api/v1/users`, {
          name,
          email,
          password,
          preferences: {
            email: true,
            push: true,
          },
        }),
      );

      this.logger.log(`User registered successfully: ${email}`);

      return response.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.response?.status === 409) {
        throw new BadRequestException('User with this email already exists');
      }

      this.logger.error('Error registering user:', error);
      throw new BadRequestException('Registration failed');
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      this.logger.error('Token verification failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
