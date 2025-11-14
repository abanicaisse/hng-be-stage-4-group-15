import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateTemplateDto, UpdateTemplateDto, TemplateType } from '@app/common';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly templateServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.templateServiceUrl = this.configService.get<string>(
      'services.templateService',
      'http://localhost:3003',
    );
  }

  async create(createTemplateDto: CreateTemplateDto) {
    this.logger.debug(`Proxying create template request to: ${this.templateServiceUrl}`);
    const response = await firstValueFrom(
      this.httpService.post(`${this.templateServiceUrl}/api/v1/templates`, createTemplateDto),
    );
    return response.data;
  }

  async findAll(page = 1, limit = 10, type?: TemplateType) {
    this.logger.debug(`Proxying find all templates request to: ${this.templateServiceUrl}`);
    const params: any = { page, limit };
    if (type) {
      params.type = type;
    }
    const response = await firstValueFrom(
      this.httpService.get(`${this.templateServiceUrl}/api/v1/templates`, { params }),
    );
    return response.data;
  }

  async findOne(id: string) {
    this.logger.debug(`Proxying find template by ID request to: ${this.templateServiceUrl}`);
    const response = await firstValueFrom(
      this.httpService.get(`${this.templateServiceUrl}/api/v1/templates/${id}`),
    );
    return response.data;
  }

  async findByCode(code: string) {
    this.logger.debug(`Proxying find template by code request to: ${this.templateServiceUrl}`);
    const response = await firstValueFrom(
      this.httpService.get(`${this.templateServiceUrl}/api/v1/templates/code/${code}`),
    );
    return response.data;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    this.logger.debug(`Proxying update template request to: ${this.templateServiceUrl}`);
    const response = await firstValueFrom(
      this.httpService.put(`${this.templateServiceUrl}/api/v1/templates/${id}`, updateTemplateDto),
    );
    return response.data;
  }

  async deactivate(id: string) {
    this.logger.debug(`Proxying deactivate template request to: ${this.templateServiceUrl}`);
    const response = await firstValueFrom(
      this.httpService.delete(`${this.templateServiceUrl}/api/v1/templates/${id}`),
    );
    return response.data;
  }

  async renderTemplate(code: string, variables: Record<string, any>) {
    this.logger.debug(`Proxying render template request to: ${this.templateServiceUrl}`);
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.templateServiceUrl}/api/v1/templates/render/${code}`,
        variables,
      ),
    );
    return response.data;
  }
}
