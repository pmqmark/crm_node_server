import { Types } from 'mongoose';

export interface IClient {
    _id: Types.ObjectId;
    email: string;
    password: string;
    position?: string;
    packageDetails?: string;
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