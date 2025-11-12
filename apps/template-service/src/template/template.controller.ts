import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TemplatesService } from './template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  PaginationDto,
  Public,
  TemplateType,
} from '@app/common';

@ApiTags('Templates')
@Controller('api/v1/templates')
@Public() // Internal service - all endpoints public
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 409, description: 'Template code already exists' })
  @ApiResponse({ status: 400, description: 'Invalid template syntax' })
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: TemplateType })
  async findAll(@Query() paginationDto: PaginationDto, @Query('type') type?: TemplateType) {
    return this.templatesService.findAll(paginationDto.page, paginationDto.limit, type);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get template by code' })
  @ApiParam({ name: 'code', description: 'Template code' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findByCode(@Param('code') code: string) {
    return this.templatesService.findByCode(code);
  }

  @Post('render/:code')
  @ApiOperation({ summary: 'Render a template with variables' })
  @ApiParam({ name: 'code', description: 'Template code' })
  @ApiResponse({ status: 200, description: 'Template rendered successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 400, description: 'Failed to render template' })
  async renderTemplate(@Param('code') code: string, @Body() variables: Record<string, any>) {
    return this.templatesService.renderTemplate(code, variables);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid template ID format');
    }
    return this.templatesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id', description: 'Template ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 400, description: 'Invalid template syntax' })
  async update(@Param('id') id: string, @Body() updateTemplateDto: UpdateTemplateDto) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate template' })
  @ApiParam({ name: 'id', description: 'Template ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Template deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deactivate(@Param('id') id: string) {
    return this.templatesService.deactivate(id);
  }
}
