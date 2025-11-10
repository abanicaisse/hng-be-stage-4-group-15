import { Module } from '@nestjs/common';
import { TemplateServiceController } from './template-service.controller';
import { TemplateServiceService } from './template-service.service';

@Module({
  imports: [],
  controllers: [TemplateServiceController],
  providers: [TemplateServiceService],
})
export class TemplateServiceModule {}
