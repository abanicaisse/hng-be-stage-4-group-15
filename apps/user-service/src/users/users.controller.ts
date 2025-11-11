import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, PaginationDto, Public } from '@app/common';

@ApiTags('Users')
@Controller('api/v1/users')
@Public() // All endpoints are public for internal service
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto.page, paginationDto.limit);
  }

  @Get('email/:email')
  @ApiOperation({ summary: 'Get user by email' })
  @ApiParam({ name: 'email', type: String, description: 'User email address' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  async findOne(@Param('id') id: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid user ID format. Must be a valid UUID');
    }
    return this.usersService.findOne(id);
  }

  @Get(':id/preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  async getPreferences(@Param('id') id: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid user ID format. Must be a valid UUID');
    }
    return this.usersService.getUserPreferences(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user information' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data or UUID format' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid user ID format. Must be a valid UUID');
    }
    return this.usersService.update(id, updateUserDto);
  }
}
