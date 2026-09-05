import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  roleSlug!: string;
}

export class Verify2FADto {
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class SetupTelegramDto {
  @IsString()
  @IsNotEmpty()
  chatId!: string;
}

export class SetupAlertasDuenoDto {
  @IsString()
  @IsNotEmpty()
  chatId!: string;

  @IsString()
  @IsOptional()
  telefono?: string;
}

export class ConfirmTotpDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class QrAuthorizeDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class QrPollDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
