import { Types } from 'mongoose';
import { CreateUserDto } from '../dtos/user.dto';

export interface IClient extends CreateUserDto {
    position: string;
    packageDetails: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
}

export interface ValidatedClient {
    _id: Types.ObjectId;
    email: string;
    position: string;
    packageDetails: string;
}
