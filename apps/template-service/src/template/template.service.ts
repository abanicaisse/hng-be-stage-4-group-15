import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CacheService } from '@app/cache';
import { CreateTemplateDto, UpdateTemplateDto, TemplateType } from '@app/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly CACHE_TTL = 7200; // 2 hours

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
  ) {
    this.registerHandlebarsHelpers();
  }

  async create(createTemplateDto: CreateTemplateDto) {
    this.logger.log(`Creating template: ${createTemplateDto.code}`);

    const existingTemplate = await this.databaseService.template.findUnique({
      where: { code: createTemplateDto.code },
    });

    if (existingTemplate) {
      this.logger.warn(`Template already exists: ${createTemplateDto.code}`);
      throw new ConflictException('Template with this code already exists');
    }

    // Validate template syntax
    this.validateTemplateSyntax(createTemplateDto.content);

    const template = await this.databaseService.template.create({
      data: {
        code: createTemplateDto.code,
        name: createTemplateDto.name,
        type: createTemplateDto.type as any,
        subject: createTemplateDto.subject,
        content: createTemplateDto.content,
        variables: createTemplateDto.variables || {},
        version: 1,
        is_active: true,
      },
    });

    await this.cacheTemplate(template.code, template);

    this.logger.log(`Template created successfully: ${template.id}`);

    return this.formatTemplateResponse(template);
  }

  async findAll(page = 1, limit = 10, type?: TemplateType) {
    this.logger.debug(`Finding all templates: page=${page}, limit=${limit}, type=${type}`);

    const skip = (page - 1) * limit;
    const where: any = { is_active: true };

    if (type) {
      where.type = type;
    }

    const [templates, total] = await Promise.all([
      this.databaseService.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.databaseService.template.count({ where }),
    ]);

    return {
      data: templates.map((t) => this.formatTemplateResponse(t)),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        has_next: skip + limit < total,
        has_previous: page > 1,
      },
    };
  }

  async findOne(id: string) {
    this.logger.debug(`Finding template: ${id}`);

    const template = await this.databaseService.template.findUnique({
      where: { id },
    });

    if (!template) {
      this.logger.warn(`Template not found: ${id}`);
      throw new NotFoundException('Template not found');
    }

    return this.formatTemplateResponse(template);
  }

  async findByCode(code: string) {
    this.logger.debug(`Finding template by code: ${code}`);

    // Try cache first
    const cacheKey = `template:${code}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Template retrieved from cache: ${code}`);
      return cached;
    }

    // Fetch from database
    const template = await this.databaseService.template.findUnique({
      where: { code, is_active: true },
    });

    if (!template) {
      this.logger.warn(`Template not found: ${code}`);
      throw new NotFoundException('Template not found');
    }

    const formattedTemplate = this.formatTemplateResponse(template);

    await this.cacheTemplate(code, formattedTemplate);

    return formattedTemplate;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto) {
    this.logger.log(`Updating template: ${id}`);

    const existingTemplate = await this.databaseService.template.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      this.logger.warn(`Template not found for update: ${id}`);
      throw new NotFoundException('Template not found');
    }

    // Validate new content if provided
    if (updateTemplateDto.content) {
      this.validateTemplateSyntax(updateTemplateDto.content);
    }

    const updateData: any = {};

    if (updateTemplateDto.name) {
      updateData.name = updateTemplateDto.name;
    }

    if (updateTemplateDto.subject) {
      updateData.subject = updateTemplateDto.subject;
    }

    if (updateTemplateDto.content) {
      updateData.content = updateTemplateDto.content;
      // Increment version when content changes
      updateData.version = existingTemplate.version + 1;
    }

    if (updateTemplateDto.variables) {
      updateData.variables = updateTemplateDto.variables;
    }

    const updatedTemplate = await this.databaseService.template.update({
      where: { id },
      data: updateData,
    });

    // Invalidate cache
    await this.cacheService.del(`template:${existingTemplate.code}`);

    this.logger.log(`Template updated successfully: ${id}`);

    return this.formatTemplateResponse(updatedTemplate);
  }

  async deactivate(id: string) {
    this.logger.log(`Deactivating template: ${id}`);

    const template = await this.databaseService.template.findUnique({
      where: { id },
    });

    if (!template) {
      this.logger.warn(`Template not found for deactivation: ${id}`);
      throw new NotFoundException('Template not found');
    }

    const deactivatedTemplate = await this.databaseService.template.update({
      where: { id },
      data: { is_active: false },
    });

    await this.cacheService.del(`template:${template.code}`);

    this.logger.log(`Template deactivated successfully: ${id}`);

    return this.formatTemplateResponse(deactivatedTemplate);
  }

  async renderTemplate(code: string, variables: Record<string, any>) {
    this.logger.debug(`Rendering template: ${code}`);

    const template: any = await this.findByCode(code);

    try {
      // Compile and render template
      const compiledTemplate = Handlebars.compile(template.content);
      const renderedContent = compiledTemplate(variables);

      // Render subject if it contains variables
      const compiledSubject = Handlebars.compile(template.subject);
      const renderedSubject = compiledSubject(variables);

      this.logger.debug(`Template rendered successfully: ${code}`);

      return {
        subject: renderedSubject,
        content: renderedContent,
        template_code: code,
        template_name: template.name,
        template_type: template.type,
      };
    } catch (error) {
      this.logger.error(`Error rendering template ${code}:`, error);
      throw new BadRequestException(`Failed to render template: ${error.message}`);
    }
  }

  private validateTemplateSyntax(content: string) {
    try {
      Handlebars.compile(content);
    } catch (error) {
      this.logger.error('Invalid template syntax:', error);
      throw new BadRequestException(`Invalid template syntax: ${error.message}`);
    }
  }

  private registerHandlebarsHelpers() {
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('formatDate', (date: Date) => {
      return date ? new Date(date).toLocaleDateString() : '';
    });

    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    this.logger.log('Handlebars helpers registered');
  }

  private async cacheTemplate(code: string, template: any) {
    await this.cacheService.set(`template:${code}`, template, this.CACHE_TTL);
  }

  private formatTemplateResponse(template: any) {
    return {
      id: template.id,
      code: template.code,
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      version: template.version,
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  }
}
