import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, JudgeLoginDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь успешно зарегистрирован' })
  @ApiResponse({ status: 409, description: 'Пользователь с таким email уже существует' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('judge-login')
  @ApiOperation({ summary: 'Упрощенный вход для судей' })
  @ApiResponse({ status: 200, description: 'Успешный вход судьи' })
  @ApiResponse({ status: 401, description: 'Судья не найден или не назначен' })
  async judgeLogin(@Body() dto: JudgeLoginDto) {
    return this.authService.judgeLogin(dto);
  }

  @Get('judges')
  @ApiOperation({ summary: 'Получить список судей для упрощенного входа' })
  @ApiResponse({ status: 200, description: 'Список судей' })
  async getJudgesForLogin(@Query('competitionId') competitionId?: string) {
    return this.authService.getJudgesForLogin(competitionId);
  }
}
