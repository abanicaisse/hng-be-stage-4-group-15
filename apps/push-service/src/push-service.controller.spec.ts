import { Test, TestingModule } from '@nestjs/testing';
import { PushServiceController } from './push-service.controller';
import { PushServiceService } from './push-service.service';

describe('PushServiceController', () => {
  let pushServiceController: PushServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PushServiceController],
      providers: [PushServiceService],
    }).compile();

    pushServiceController = app.get<PushServiceController>(PushServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pushServiceController.getHello()).toBe('Hello World!');
    });
  });
});
