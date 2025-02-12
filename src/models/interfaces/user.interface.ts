import { Types } from 'mongoose';
export interface IUser {
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    companyId:string,
    roles:"admin"|"Employee",
    isActive: boolean;
}


export interface ValidatedUser {
  _id: Types.ObjectId;
  email: string;
  
  roles:string
}