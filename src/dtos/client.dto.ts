
import { CreateUserDto } from '../dtos/user.dto';

export interface CreateClientDto extends CreateUserDto {
  position?: string;
  packageDetails?: string;
}