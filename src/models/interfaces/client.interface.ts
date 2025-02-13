import { Types } from 'mongoose';
import { CreateClientDto } from '../dtos/client.dto';

export interface IClient extends CreateClientDto {
    _id: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ValidatedClient {
    _id: Types.ObjectId;
    email: string;
    position?: string;
    packageDetails?: string;
}
