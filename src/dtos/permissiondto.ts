import { IsString, IsNotEmpty } from 'class-validator';

export interface IPermissionDto {
  permissionId: string;
  name: string;
}

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionId: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}