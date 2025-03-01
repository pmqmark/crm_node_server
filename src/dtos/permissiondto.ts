export interface IPermissionDto {
  name: string;
}

export class CreatePermissionDto {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}