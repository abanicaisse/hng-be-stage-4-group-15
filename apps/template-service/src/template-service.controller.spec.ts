import { Test, TestingModule } from '@nestjs/testing';
import { TemplateServiceController } from './template-service.controller';
import { TemplateServiceService } from './template-service.service';

describe('TemplateServiceController', () => {
  let templateServiceController: TemplateServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TemplateServiceController],
      providers: [TemplateServiceService],
    }).compile();

    templateServiceController = app.get<TemplateServiceController>(TemplateServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(templateServiceController.getHello()).toBe('Hello World!');
    });
  });
});
