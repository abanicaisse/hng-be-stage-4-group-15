import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { CacheModule } from '@app/cache';
import { TemplatesController } from './template.controller';
import { TemplatesService } from './template.service';

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
