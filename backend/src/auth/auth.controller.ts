import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { AlertasDuenoService } from './alertas-dueno.service';
import { QrLoginService } from './qr-login.service';
import {
  LoginDto,
  Verify2FADto,
  SetupTelegramDto,
  SetupAlertasDuenoDto,
  ConfirmTotpDto,
  QrAuthorizeDto,
  QrPollDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactor: TwoFactorService,
    private alertasDueno: AlertasDuenoService,
    private qrLogin: QrLoginService,
  ) {}

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('2fa/verify')
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  verify2FA(@Body() dto: Verify2FADto) {
    return this.authService.verifyTwoFactor(dto.tempToken, dto.code);
  }

  @Post('2fa/resend-telegram')
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  resendTelegram(@Body('tempToken') tempToken: string) {
    const userId = this.twoFactor.verifyTempToken(tempToken);
    return this.twoFactor.resendTelegram(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  status2FA(@CurrentUser() user: AuthUser) {
    return this.twoFactor.getStatus(user.id);
  }

  @Post('2fa/setup/totp')
  @UseGuards(JwtAuthGuard)
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.twoFactor.setupTotp(user.id);
  }

  @Post('2fa/setup/totp/confirm')
  @UseGuards(JwtAuthGuard)
  confirmTotp(@CurrentUser() user: AuthUser, @Body() dto: ConfirmTotpDto) {
    return this.twoFactor.confirmTotp(user.id, dto.code);
  }

  @Post('2fa/setup/telegram')
  @UseGuards(JwtAuthGuard)
  setupTelegram(@CurrentUser() user: AuthUser, @Body() dto: SetupTelegramDto) {
    return this.twoFactor.setupTelegram(user.id, dto.chatId);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  disable2FA(@CurrentUser() user: AuthUser) {
    return this.twoFactor.disable2FA(user.id);
  }

  @Get('alertas-dueno/status')
  @UseGuards(JwtAuthGuard)
  alertasDuenoStatus(@CurrentUser() user: AuthUser) {
    return this.alertasDueno.getStatus(user.id);
  }

  @Post('alertas-dueno/setup')
  @UseGuards(JwtAuthGuard)
  setupAlertasDueno(@CurrentUser() user: AuthUser, @Body() dto: SetupAlertasDuenoDto) {
    return this.alertasDueno.setup(user.id, dto.chatId, dto.telefono);
  }

  @Post('alertas-dueno/disable')
  @UseGuards(JwtAuthGuard)
  disableAlertasDueno(@CurrentUser() user: AuthUser) {
    return this.alertasDueno.disable(user.id);
  }

  @Post('qr/session')
  createQrSession() {
    return this.qrLogin.createSession();
  }

  @Post('qr/session/:id/authorize')
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  authorizeQr(@Param('id') id: string, @Body() dto: QrAuthorizeDto) {
    return this.qrLogin.authorizeSession(id, dto.token, dto.email, dto.password);
  }

  @Post('qr/session/:id/poll')
  pollQr(@Param('id') id: string, @Body() dto: QrPollDto) {
    return this.qrLogin.pollSession(id, dto.token);
  }
}
