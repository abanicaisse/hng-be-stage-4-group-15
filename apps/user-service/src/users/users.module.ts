import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CacheModule } from '@app/cache';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
