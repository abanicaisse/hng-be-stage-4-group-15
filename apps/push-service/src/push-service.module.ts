import { Module } from '@nestjs/common';
import { PushServiceController } from './push-service.controller';
import { PushServiceService } from './push-service.service';

@Module({
  imports: [],
  controllers: [PushServiceController],
  providers: [PushServiceService],
})
export class PushServiceModule {}
