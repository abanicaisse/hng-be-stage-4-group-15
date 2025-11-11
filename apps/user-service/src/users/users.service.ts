import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CacheService } from '@app/cache';
import { CreateUserDto, UpdateUserDto } from '@app/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: DatabaseService,
    private readonly cache: CacheService,
  ) {}

  // Create a new user
  async create(createUserDto: CreateUserDto) {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const password_hash = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password_hash,
        push_token: createUserDto.push_token,
        email_enabled: createUserDto.preferences.email,
        push_enabled: createUserDto.preferences.push,
      },
      select: {
        id: true,
        name: true,
        email: true,
        push_token: true,
        email_enabled: true,
        push_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });

    this.logger.log(`User created successfully: ${user.id}`);

    // Cache the user
    await this.cacheUser(user);

    return {
      ...user,
      preferences: {
        email: user.email_enabled,
        push: user.push_enabled,
      },
    };
  }

  //  Get all users with pagination
  async findAll(page: number = 1, limit: number = 10) {
    this.logger.log(`Fetching users - page: ${page}, limit: ${limit}`);

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          push_token: true,
          email_enabled: true,
          push_enabled: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map((user: any) => ({
        ...user,
        preferences: {
          email: user.email_enabled,
          push: user.push_enabled,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Find user by ID
  async findOne(id: string) {
    this.logger.log(`Fetching user by ID: ${id}`);

    const cached = await this.getCachedUser(id);
    if (cached) {
      this.logger.debug(`User found in cache: ${id}`);
      return cached;
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        push_token: true,
        email_enabled: true,
        push_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const result = {
      ...user,
      preferences: {
        email: user.email_enabled,
        push: user.push_enabled,
      },
    };

    await this.cacheUser(result);

    return result;
  }

  // Find user by email
  async findByEmail(email: string) {
    this.logger.log(`Fetching user by email: ${email}`);

    const cacheKey = `user:email:${email}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`User found in cache by email: ${email}`);
      return JSON.parse(cached as string);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        push_token: true,
        email_enabled: true,
        push_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    const result = {
      ...user,
      preferences: {
        email: user.email_enabled,
        push: user.push_enabled,
      },
    };

    await this.cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    await this.cacheUser(result);

    return result;
  }

  // Find user by email for authentication (includes password hash)
  async findByEmailWithPassword(email: string) {
    this.logger.log(`Fetching user by email for auth: ${email}`);

    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Update user
  async update(id: string, updateUserDto: UpdateUserDto) {
    this.logger.log(`Updating user: ${id}`);

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData: any = {
      ...(updateUserDto.name && { name: updateUserDto.name }),
      ...(updateUserDto.push_token !== undefined && { push_token: updateUserDto.push_token }),
    };

    if (updateUserDto.preferences) {
      if (updateUserDto.preferences.email !== undefined) {
        updateData.email_enabled = updateUserDto.preferences.email;
      }
      if (updateUserDto.preferences.push !== undefined) {
        updateData.push_enabled = updateUserDto.preferences.push;
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        push_token: true,
        email_enabled: true,
        push_enabled: true,
        created_at: true,
        updated_at: true,
      },
    });

    this.logger.log(`User updated successfully: ${id}`);

    const result = {
      ...user,
      preferences: {
        email: user.email_enabled,
        push: user.push_enabled,
      },
    };

    // Invalidate cache
    await this.invalidateUserCache(id, user.email);
    // Re-cache the updated user
    await this.cacheUser(result);

    return result;
  }

  // Get user notification preferences
  async getUserPreferences(id: string) {
    this.logger.log(`Fetching preferences for user: ${id}`);

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email_enabled: true,
        push_enabled: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      user_id: user.id,
      preferences: {
        email: user.email_enabled,
        push: user.push_enabled,
      },
    };
  }

  private async cacheUser(user: any) {
    try {
      const cacheKey = `user:${user.id}`;
      await this.cache.set(cacheKey, JSON.stringify(user), this.CACHE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to cache user: ${error.message}`);
    }
  }

  private async getCachedUser(id: string) {
    try {
      const cacheKey = `user:${id}`;
      const cached = await this.cache.get(cacheKey);
      return cached ? JSON.parse(cached as string) : null;
    } catch (error) {
      this.logger.warn(`Failed to get cached user: ${error.message}`);
      return null;
    }
  }

  private async invalidateUserCache(id: string, email: string) {
    try {
      await Promise.all([this.cache.del(`user:${id}`), this.cache.del(`user:email:${email}`)]);
    } catch (error) {
      this.logger.warn(`Failed to invalidate user cache: ${error.message}`);
    }
  }
}
