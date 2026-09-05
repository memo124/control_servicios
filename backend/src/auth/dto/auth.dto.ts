import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  roleSlug?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class Verify2FADto {
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class SetupTelegramDto {}

export class SetupAlertasDuenoDto {
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
