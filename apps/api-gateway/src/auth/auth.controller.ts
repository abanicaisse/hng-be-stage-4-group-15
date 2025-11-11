import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public, LoginDto, RegisterDto } from '@app/common';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    return this.authService.login(user);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or user already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto.email, registerDto.password, registerDto.name);
  }
}
